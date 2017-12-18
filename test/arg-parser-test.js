var chai = require('chai');
var expect = chai.expect;
var ArgParser = require('../lib/arg-parser');

chai.use(require('sinon-chai'));
chai.use(require('dirty-chai'));

describe('arg-parser', function () {
  describe('align', function () {
    describe('simple cases', function () {
      it('correctly aligns when no arguments are expected', function () {
        expect(ArgParser.align([], [])).to.deep.equal({});
      });

      it('correctly fails when not enough arguments are given', function () {
        expect(ArgParser.align(['a', 'b'], [1])).to.be.false();
      });

      it('aligns direct mappings', function () {
        expect(ArgParser.align(['a', 'b', 'c'], [1, 2, 3])).to.deep.equal({ a: 1, b: 2, c: 3 });
      });
    });

    describe('splatting', function () {
      it('correctly aligns required arguments before splatting', function () {
        var args = ['a', 'b', 'c...'];
        expect(ArgParser.align(args, [1])).to.be.false();
        expect(ArgParser.align(args, [1, 2])).to.deep.equal({ a: 1, b: 2, c: [] });
        expect(ArgParser.align(args, [1, 2, 3])).to.deep.equal({ a: 1, b: 2, c: [3] });
        expect(ArgParser.align(args, [1, 2, 3, 4, 5])).to.deep.equal({ a: 1, b: 2, c: [3, 4, 5] });
      });

      it('correctly aligns required arguments around splatting', function () {
        var args = ['a', 'b', 'c...', 'd', 'e'];
        expect(ArgParser.align(args, [1, 2, 3])).to.be.false();
        expect(ArgParser.align(args, [1, 2, 3, 4])).to.deep.equal({
          a: 1, b: 2, c: [], d: 3, e: 4
        });
        expect(ArgParser.align(args, [1, 2, 3, 4, 5])).to.deep.equal({
          a: 1, b: 2, c: [3], d: 4, e: 5
        });
        expect(ArgParser.align(args, [1, 2, 3, 4, 5, 6, 7])).to.deep.equal({
          a: 1, b: 2, c: [3, 4, 5], d: 6, e: 7
        });
      });
    });

    describe('optional', function () {
      it('allows objects to be passed instead of strings', function () {
        expect(ArgParser.align(['a', { b: 2 }], [1])).to.deep.equal({ a: 1, b: 2 });
      });

      it('correctly overrides defaults when a value is given', function () {
        expect(ArgParser.align(['a', { b: 2 }], [1, 3])).to.deep.equal({ a: 1, b: 3 });
      });

      it('functions when no values are passed for all optional arguments', function () {
        expect(ArgParser.align([{ a: 1 }, { b: 2 }], [])).to.deep.equal({ a: 1, b: 2 });
      });
    });
  });

  describe('validate', function () {
    describe('positive cases', function () {
      it('base case', function () {
        expect(ArgParser.validate([])).to.be.true();
      });

      it('only required arguments', function () {
        expect(ArgParser.validate(['a', 'b', 'c'])).to.be.true();
      });

      it('all optional arguments', function () {
        expect(ArgParser.validate([{ a: 1 }, { b: 2 }])).to.be.true();
      });

      it('required and optional arguments', function () {
        expect(ArgParser.validate(['a', 'b', { c: 3 }, { d: 4 }])).to.be.true();
      });

      it('just splatting', function () {
        expect(ArgParser.validate(['a...'])).to.be.true();
      });

      it('required arguments and splatting on end', function () {
        expect(ArgParser.validate(['a', 'b', 'c...'])).to.be.true();
      });

      it('required arguments around splatting', function () {
        expect(ArgParser.validate(['a', 'b...', 'c'])).to.be.true();
      });

      it('required arguments after splatting', function () {
        expect(ArgParser.validate(['a...', 'b', 'c'])).to.be.true();
      });

      it('required arguments, optional arguments, and splatting', function () {
        expect(ArgParser.validate(['a', 'b', { c: 3 }, { d: 4 }, 'e...'])).to.be.true();
      });
    });

    describe('negative cases', function () {
      it('double splatting', function () {
        expect(ArgParser.validate(['a...', 'b', 'c...'])).to.be.false();
      });

      it('required arguments around optional arguments', function () {
        expect(ArgParser.validate(['a', { b: 2 }, 'c'])).to.be.false();
      });

      it('splatting before optional argument', function () {
        expect(ArgParser.validate(['a...', { b: 2 }])).to.be.false();
      });
    });
  });
});
