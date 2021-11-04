const route = require('express').Router();

const ipModel = require('../Model/ipModel');

route.post('/add-ip', async (req, res) => {
  try {
    const ipExist = await ipModel.findOne({ ip: req.body.ip });

    if (ipExist) {
      return res.status(201).json({
        message: 'This IP already exist. Please try another one',
      });
    }

    const newIp = new ipModel({
      name: req.body.name,
      ip: req.body.ip,
    });

    newIp.save();

    return res.status(200).json({
      message: 'IP Added Successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

module.exports = route;