'use strict';

const fs = require('fs');
const path = require('path');

const IamServiceMock = require('./dist/commonjs').IamServiceMock;

// This function will be called by the setup, when registering ioc modules at the container.
const registerInContainer = (container) => {

  // This removes the necessity for having a running IdentityServer during sample execution.
  container.register('IamService', IamServiceMock);
};

module.exports.registerInContainer = registerInContainer;
