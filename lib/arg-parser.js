'use strict';

var Utils = {
  alignArg: function (aligned, arg, value) {
    var returnValue = aligned;
    var optionalArgName;

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
    if (arg instanceof Object) {
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

    for (argIndex = 0; argIndex < args.length; argIndex += 1) {
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

      for (argIndex = 0; argIndex < args.length; argIndex += 1) {
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

    for (argIndex = 0; argIndex < args.length; argIndex += 1) {
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
