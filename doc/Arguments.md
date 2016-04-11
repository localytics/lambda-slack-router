# Command Arguments

Commands can optionally have arguments. When commands have arguments, the router will only invoke that command if the number of arguments matches. Arguments are specified as an array as the second argument to `addCommand`. As an example:

```javascript
slackbot.addCommand('testing', ['one', 'two'], 'Testing', function (options, callback) {
  callback(null, this.ephemeralResponse('One: ' + options.args.one + ', Two: ' + options.args.two));
});
```

There are four types of arguments: required, optional, splat, and configured.

## Required

The two arguments in the above command are both required.

## Optional

To specify an optional argument, use an object with one key, where the key is the name of the argument and the value is the default value.

```javascript
slackbot.addCommand('testing', [{ one: 'default' }], 'Testing', function (options, callback) {
  callback(null, this.ephemeralResponse('One: ' + options.args.one));
});
```

## Splat

To specify a splat argument (one that will be an array of indeterminant length), append an ellipsis to the end of the name.

```javascript
slackbot.addCommand('testing', ['words...'], 'Testing', function (options, callback) {
  callback(null, this.ephemeralResponse('Words: ' + options.args.words.join(' ')));
});
```

## Configured

To specify a configured argument, use a nested object with one key, where the key is the name of the argument and the value is the argument options. The available options are `default`, which allows for providing a default value for the argument, and `restrict`, which lets you restrict what values are allowed.

The value of the `restrict` parameter can be a string, number, or array. If it is an array, the value will be permitted if it matches any element in the array. If the value that the user passes does not match the restricted value, an error will be thrown.

```javascript
slackbot.addCommand('test-one', [{ one: { default: 'default' } }], 'Testing', function (options, callback) {
  callback(null, this.ephemeralResponse('One: ' + options.args.one));
});

slackbot.addCommand('test-two', [{ one: { restrict: ['foo', 'bar'] } }], 'Testing', function (options, callback) {
  callback(null, this.ephemeralResponse('One: ' + options.args.one));
});
```

## Putting it all together

An example that uses all four types of arguments is below:

```javascript
slackbot.addCommand(
  'echo',
  ['title', { firstName: 'John' }, { lastName: { default: 'Smith', restrict: ['Jones', 'Smith'] } }, 'words...'],
  'Respond to the user',
  function (options, callback) {
    var response = 'Hello ' + options.args.title + ' ' + options.args.firstName + ' ' + options.args.lastName;
    if (option.args.words.length) {
      response += ', ' + options.args.words.join(' ');
    }
    callback(null, this.ephemeralResponse(response));
  });
```
