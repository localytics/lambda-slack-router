'use strict';

var Utils = {
  isString: function (val) {
    return typeof val === 'string' || val instanceof String;
  },

  isNumber: function (val) {
    return typeof val === 'number';
  },

  alignArg: function (aligned, arg, value) {
    var returnValue = aligned;
    var optionalArgName;
    var configuredArgName;
    var configuredArgOpts;
    var restrict;

    switch (this.typeOf(arg)) {
      case 'opt':
        optionalArgName = Object.keys(arg)[0];
        if (typeof value === 'undefined') {
          returnValue[optionalArgName] = arg[optionalArgName];
        } else {
          returnValue[optionalArgName] = value;
        }
        break;
      case 'splat':
        returnValue = 'splat';
        break;
      case 'configured':
        configuredArgName = Object.keys(arg)[0];
        configuredArgOpts = arg[configuredArgName];
        if (configuredArgOpts.default && typeof value === 'undefined') {
          returnValue[configuredArgName] = configuredArgOpts.default;
        } else {
          restrict = configuredArgOpts.restrict;
          if (restrict instanceof Array) {
            if (restrict.indexOf(value) === -1) {
              return false;
            }
          } else if ((Utils.isString(restrict) || Utils.isNumber(restrict))) {
            if (value !== restrict) {
              return false;
            }
          } else if (typeof restrict !== 'undefined') {
            throw new TypeError('Argument restriction must be a string, number, or array');
          }
          returnValue[configuredArgName] = value;
        }
        break;
      default:
        if (typeof value === 'undefined') {
          return false;
        }
        returnValue[arg] = value;
        break;
    }
    return returnValue;
  },

  minimumRequired: function (args) {
    return args.filter(function (arg) {
      return Utils.typeOf(arg) === 'req';
    }).length;
  },

  splatPattern: /\.\.\.$/,

  typeOf: function (arg) {
    var argName;

    if (arg instanceof Object) {
      argName = Object.keys(arg)[0];
      if (arg[argName] instanceof Object) {
        return 'configured';
      }
      return 'opt';
    }
    if (arg.match(this.splatPattern)) {
      return 'splat';
    }
    return 'req';
  }
};

module.exports = {
  align: function (args, values) {
    var aligned = {};
    var alignArgValue;
    var argIndex;
    var splatIndex;

    if (values.length < Utils.minimumRequired(args)) {
      return false;
    }

    for (argIndex = 0; argIndex < args.length; argIndex++) {
      alignArgValue = Utils.alignArg(aligned, args[argIndex], values[argIndex]);
      if (alignArgValue === false) {
        return false;
      } else if (alignArgValue === 'splat') {
        splatIndex = argIndex;
        break;
      }
      aligned = alignArgValue;
    }

    if (alignArgValue === 'splat') {
      args.reverse();
      values.reverse();

      for (argIndex = 0; argIndex < args.length; argIndex++) {
        alignArgValue = Utils.alignArg(aligned, args[argIndex], values[argIndex]);
        if (alignArgValue === false) {
          return false;
        } else if (alignArgValue === 'splat') {
          break;
        }
        aligned = alignArgValue;
      }

      args.reverse();
      values.reverse();
      aligned[args[splatIndex].substring(0, args[splatIndex].length - 3)] =
        values.slice(splatIndex, values.length - argIndex);
    }

    return aligned;
  },

  validate: function (args) {
    var argIndex;
    var foundOptionalArgs = false;
    var foundSplattingArgs = false;

    for (argIndex = 0; argIndex < args.length; argIndex++) {
      switch (Utils.typeOf(args[argIndex])) {
        case 'opt':
          if (foundSplattingArgs) {
            return false; // cannot have optional arguments after a splat
          }
          foundOptionalArgs = true;
          break;
        case 'splat':
          if (foundSplattingArgs) {
            return false; // cannot have two splatting arguments
          }
          foundSplattingArgs = true;
          break;
        default:
          if (foundOptionalArgs) {
            return false; // cannot have required arguments after optional arguments
          }
          break;
      }
    }
    return true;
  }
};
