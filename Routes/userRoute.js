const route = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserModel = require('../Model/userModel');
const TranxModel = require('../Model/tranxModel');
const WithdrawalModel = require('../Model/withdrawalModel');
const IPModel = require('../Model/ipModel');
const { UserAuthMiddleware } = require('../Middlewares/authMiddleware');
const { ipLookup } = require('../functions/ipLookup');
const { registerValidation, loginValidation } = require('../Joi_Validation/register_login_validation');
const walletGen = require('../functions/walletGen');
const refGen = require('../functions/refGen');

route.post('/register', async (req, res) => {
  const { error } = registerValidation(req.body);
  if (error) {
    return res.status(400).json({message: error.details[0].message});
  }

  try {
    const ipExist = await IPModel.findOne({ ip: req.body.ip });

    const emailExist = await UserModel.findOne({ email: req.body.email });
    // const phoneExist = await UserModel.findOne({ phoneNumber: req.body.phone });
    if (emailExist) {
      return res.status(400).json({
        message: 'Email is already in Use',
      });
    }
    // if (phoneExist) {
    //   return res.status(400).json({
    //     message: 'Phone Number is already in Use',
    //   });
    // }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    let isClient;

    await ipLookup(req.body.ip, async (err, data) => {
      try {
        if (err) {
          return res.status(400).json({
            message: 'We could not validate your information. Please try again!',
          });
        }
  
        if (data === null) {
          return res.status(400).json({
            message: 'We could not validate your information. Please try again!',
          });
        }
  
        if (data.toLowerCase() === 'nigeria') {
          isClient = false;

          if (!ipExist) {
            return res.status(403).json({
              message: 'Forbidden to Access this Page',
            });
          }
        } else {
          isClient = true;
        }
      } catch (error) {
        return res.status(500).json({
          message: 'Internal Server Error',
        });
      }
    });

    const walletAddress = walletGen().trim();

    const user = new UserModel({
      name: req.body.name,
      email: req.body.email,
      phoneNumber: req.body.phone,
      isClient,
      ipAddress: req.body.ip,
      walletAddress,
      password: hashedPassword,
    });
    const token = jwt.sign({ _id: user._id }, process.env.UserToken, { expiresIn: 60 * 60 });
    res.header('auth-token', token);
    user.save();

    return (res.status(200).json({
      token,
      user,
    }));
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      errMessage: 'Something Went Wrong!!',
    });
  }
});

route.post('/login', async (req, res) => {
  const { error } = loginValidation(req.body);
  if (error) {
    return res.status(400).json({message: error.details[0].message});
  }

  try {
    let user;
    if (req.body.email) {
      user = await UserModel.findOne({
        email: req.body.email,
      });
    } else if (req.body.phone) {
      user = await UserModel.findOne({
        phoneNumber: req.body.phone,
      });
    } else {
      return res.status(400).json({ message: 'Please use email to login' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Incorrect Credentials!!'});
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Incorrect Credentials!!'});
    }
    const token = jwt.sign({ _id: user._id }, process.env.UserToken, { expiresIn: 60 * 60 });
    res.header('auth-token', token);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      errMessage: 'Something Went Wrong!!',
    });
  }
});

route.get('/', UserAuthMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user);

    const ip = req.header('ip');
    
    const name = user.name.split(' ');

    return res.status(200).json({
      user: {
        name: name[0],
        email: user.email,
        phone: user.phoneNumber,
        accountBalance: user.accountBalance,
        address: user.address,
        walletAddress: user.walletAddress,
        isClient: user.isClient,
        investmentPlan: user.investmentPlan,
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Serval Error',
    });
  }
});

route.post('/receipient', UserAuthMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user);
    const receipient = await UserModel.findOne({ walletAddress: req.body.wallet });

    if(!receipient) {
      return res.status(404).json({
        message: 'No User Found with that Wallet Address',
      });
    }

    if (user.walletAddress === req.body.wallet) {
      return res.status(201).json({
        message: 'Error. Can not transfer to same beneficiary',
      });
    }


    return res.status(200).json({
      id: receipient._id,
      user: receipient.name,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal Server Error. Try Again!!',
    });
  }
});

route.put('/transfer', UserAuthMiddleware, async (req, res) => {
  try {
    const sender = await UserModel.findById(req.user);
    const receiver = await UserModel.findById(req.body.id);

    let profit;
    let dateToEnd;

    if (req.body.plan === 'bronze') {
      profit = 0.045;
      dateToEnd = 28800000;
    }

    if (req.body.plan === 'silver') {
      profit = 0.05
      dateToEnd = 86400000;
    }

    if (req.body.plan === 'gold') {
      profit = 0.065;
      dateToEnd = 172800000;
    }

    if (req.body.plan === 'diamond') {
      profit = 0.07;
      dateToEnd = 259200000;
    }

    if (sender.accountBalance === 0) {
      return res.status(201).json({
        message: 'Insufficient Funds!!',
      });
    }

    if (req.body.amount > sender.accountBalance) {
      return res.status(201).json({
        message: 'Insufficient Funds!!',
      });
    }

    const senderBalance = sender.accountBalance - req.body.amount;
    const receiverBalance = receiver.accountBalance + req.body.amount;

    const ref = refGen(15);
    const date = new Date();

    const transDoc = new TranxModel({
      sender: sender._id,
      receiver: receiver._id,
      investmentPlan: req.body.plan,
      amount: req.body.amount,
      ref,
      date
    });

    transDoc.save();

    const updatedSender = await UserModel.findByIdAndUpdate(sender._id, {
      accountBalance: senderBalance,
      // investmentPlan: req.body.plan,
      $push: {
        transfer: {
          id: transDoc._id,
          sender: true,
        },
      },
    });

    updatedSender.save();

    const updatedReceiver = await UserModel.findByIdAndUpdate(receiver._id, {
      accountBalance: receiverBalance,
      investmentPlan: {
        plan: req.body.plan,
        dateToEnd,
        profit,
      },
      $push: {
        transfer: {
          id: transDoc._id,
          sender: false,
        },
      },
    });

    updatedReceiver.save();

    return res.status(200).json({
      message: 'success',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

route.put('/update-user', UserAuthMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user);

    if (!user) {
      return res.status(404).json({
        errMessage: 'No User found... Please Register',
      });
    }

    let updatePersonalInformation;

    if (req.body.name.length !== 0 && req.body.email === '' && req.body.phone === '') {
      updatePersonalInformation = await UserModel.findByIdAndUpdate(user._id, {
        name: req.body.name,
      });
    }

    if (req.body.email.length !== 0 && req.body.name === '' && req.body.phone === '') {
      const emailExist = await UserModel.findOne({ email: req.body.email });
      if (emailExist) {
        return res.status(201).json({
          errMessage: 'This Email Already Exist!!',
        });
      }
      updatePersonalInformation = await UserModel.findByIdAndUpdate(user._id, {
        email: req.body.email,
      });
    }

    if (req.body.phone.length !== 0 && req.body.name === '' && req.body.email === '') {
      const phoneExist = await UserModel.findOne({ phoneNumber: req.body.phone });
      if (phoneExist) {
        return res.status(201).json({
          errMessage: 'This Phone Number Already Exist!!',
        });
      }
      updatePersonalInformation = await UserModel.findByIdAndUpdate(user._id, {
        phoneNumber: req.body.phone,
      });
    }

    if (req.body.name.length !== 0 && req.body.email.length !== 0 && req.body.phone.length !== 0) {
      const emailExist = await UserModel.findOne({ email: req.body.email });
      const phoneExist = await UserModel.findOne({ phone: req.body.phone });

      if (emailExist) {
        return res.status(201).json({
          errMessage: 'Email Already Exist!!',
        });
      }

      if (phoneExist) {
        return res.status(201).json({
          errMessage: 'Phone Number Already Exist!!',
        });
      }

      updatePersonalInformation = await UserModel.findOneAndUpdate({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
      });
    }

    updatePersonalInformation.save();

    return res.status(200).json({
      successMessage: 'Saved Successfully',
    });
  } catch (error) {
    return res.status(400).json({
      errMessage: 'Something went wrong!!',
    });
  }
});

route.get('/transactions', UserAuthMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user);
    const transactions = await TranxModel.find({ sender: user._id }).sort({ _id: 'desc' }).populate('receiver');


    if (transactions.length === 0) {
      return res.status(404).json({
        message: 'Not Found',
      });
    }

    return res.status(200).json({
      transactions,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

route.post('/deposit', UserAuthMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user);

    if (user.isClient) {
      const options = {
        method: 'GET',
        url: `https://api.flutterwave.com/v3/transactions/${req.body.transaction_id}/verify`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.flutterSecKey,
        },
      };
      // axios(options, (error, response) => {
      //   if (error) throw new Error(error);
      //   console.log(response.body);
      // });

      const response = await axios(options);
      if (response.status !== 200) {
        return res.status(404).json({
          status: 'failed',
          message: 'Verification Failed!!',
        });
      }

      const transDoc = new TranxModel({
        sender: user._id,
        receiver: user._id,
        amount: response.data.data.amount,
        reason: 'Self Deposit',
        ref: response.data.data.tx_ref,
        date: response.data.data.created_at,
      });

      transDoc.save();

      // After Successfully Verifying the Payment this will give value to the customer
      const giveCustomerValue = await UserModel.findByIdAndUpdate(user._id, {
        accountBalance: user.accountBalance + response.data.data.amount,
        $push: {
          transfer: {
            id: transDoc._id,
            sender: true,
          },
        },
      });

      giveCustomerValue.save();

      return res.status(200).json({
        message: 'Success',
      });
    }

    const ref = refGen(15);

    const transDoc = new TranxModel({
      sender: user._id,
      receiver: user._id,
      amount: req.body.amount,
      reason: 'Self Deposit',
      ref,
      date: new Date(),
    });

    transDoc.save();

    // After Successfully Verifying the Payment this will give value to the customer
    const giveCustomerValue = await UserModel.findByIdAndUpdate(user._id, {
      accountBalance: user.accountBalance + req.body.amount,
      $push: {
        transfer: {
          id: transDoc._id,
          sender: true,
        },
      },
    });

    giveCustomerValue.save();

    return res.status(200).json({
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

route.post('/withdraw', UserAuthMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user);

    if (user.accountBalance === 0) {
      return res.status(201).json({
        message: 'Insufficient Funds!!',
      });
    }

    if (req.body.amount > user.accountBalance) {
      return res.status(201).json({
        message: 'Insufficient Funds!!',
      });
    }

    const ref = refGen(15);

    const withdrawDoc = new WithdrawalModel({
      accountNumber: req.body.accountNumber,
      routingNumber: req.body.routingNumber,
      bankName: req.body.bankName,
      amount: req.body.amount,
      status: 'processing',
      ref,
      date: new Date(),
    });

    withdrawDoc.save();

    return res.status(200).json({
      message: 'Processing',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

module.exports = route;