const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const chalk = require('chalk');
require('dotenv').config();

// Database Connection
(async function () {
  try {
    mongoose.connect(process.env.dbConnection, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    }, () => {
      console.log(chalk.yellow('The Database is ready to establish connection!!'));
    });
  } catch (error) {
    console.log(chalk.red('The Database did not Connect!!!'));
  }

  console.log('Connecting...');

  mongoose.connection.once('open', () => {
    console.log(chalk.green('Connection Succesfully Established Connection'));
  });
}());

const corsOption = {
  origin: ['http://localhost:3000', 'https://binaryfxcrypto.com', 'http://localhost:5501', 'https://meta2trader.com', 'https://meta3trader.com', 'http://localhost:5500', 'https://bumperrs.com', 'https://octaprotraders.com'],
};


const app = express();
const userRoute = require('./Routes/userRoute');
// const devRoute = require('./Routes/devRoute');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOption));


app.use('/api/user/', userRoute);
// app.use('/api/dev', devRoute);

app.get('/', (req, res) => {
  res.send('The App is Working');
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server started at ${port}`);
});
