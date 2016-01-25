var chai = require('chai'),
    assert = chai.assert,
    Reflux = require('reflux-core'),
    RefluxPromise = require('../lib'),
    Q = require('q'),
    sinon = require('sinon');

chai.use(require('chai-as-promised'));

describe('Creating actions using promises', function() {

    Reflux.use(RefluxPromise(Q.Promise));

    describe('with children to an action definition object', function() {
        var actionNames, actions;

        beforeEach(function () {
            actionNames = {'foo': {asyncResult: true}, 'bar': {children: ['baz']}};
            actions = Reflux.createActions(actionNames);
        });

        describe('when promising an async action created this way', function() {
            var promise;

            beforeEach(function() {
                // promise resolves on foo.completed
                promise = Q.promise(function(resolve) {
                    actions.foo.completed.listen(function(){
                        resolve.apply(null, arguments);
                    }, {}); // pass empty context
                });

                // listen for foo and return a promise
                actions.foo.listenAndPromise(function() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    var deferred = Q.defer();

                    setTimeout(function() {
                        deferred.resolve(args);
                    }, 0);

                    return deferred.promise;
                });
            });

            it('should invoke the completed action with the correct arguments', function() {
                var testArgs = [1337, 'test'];
                actions.foo(testArgs[0], testArgs[1]);

                return assert.eventually.deepEqual(promise, testArgs);
            });
        });
    });

    describe('Creating multiple actions from an mixed array of strings and object definitions', function() {

        var actionNames, actions;

        var resolvedPromise = function() {
            var args = Array.prototype.slice.call(arguments, 0);
            var deferred = Q.defer();
            setTimeout(function() {
                deferred.resolve(args);
            }, 0);
            return deferred.promise;
        };

        var rejectedPromise = function() {
            var args = Array.prototype.slice.call(arguments, 0);
            var deferred = Q.defer();
            setTimeout(function() {
                deferred.reject('error');
            }, 0);
            return deferred.promise;
        };

        beforeEach(function () {


            actionNames = [
                'foo',
                'bar',
                { baz: { asyncResult: true, children: ['woo'] }},
                {
                    anotherFoo: { asyncResult: true },
                    anotherBar: { children: ['wee'] }
                },
                {
                    foobar: {
                        asyncResult: true,
                        withPromise: rejectedPromise
                    },
                    barfoo: {
                        withPromise: resolvedPromise
                    }
                }

            ];
            actions = Reflux.createActions(actionNames);
        });

        describe('when promising an async action created this way', function() {
            var promise;
            beforeEach(function() {
                // promise resolves on baz.completed
                promise = Q.promise(function(resolve) {
                    actions.baz.completed.listen(function(){
                        resolve.apply(null, arguments);
                    }, {}); // pass empty context
                });

                // listen for baz and return a promise
                actions.baz.listenAndPromise(resolvedPromise);
            });

            it('should invoke the completed action with the correct arguments', function() {
                var testArgs = [1337, 'test'];
                actions.baz(testArgs[0], testArgs[1]);

                return assert.eventually.deepEqual(promise, testArgs);
            });
        });

        describe('when using withPromise on an action', function() {
            var withPromiseResult;
            var promise;
            beforeEach(function() {

                // promise resolves on anotherFoo.completed
                promise = Q.promise(function(resolve) {
                    actions.anotherFoo.completed.listen(function(){
                        resolve.apply(null, arguments);
                    }, {}); // pass empty context
                });

                //Bind promise and return action
                withPromiseResult = actions.anotherFoo.withPromise(resolvedPromise);
            });

            it('should return the same action that completes correctly when called', function() {
                var testArgs = [1337, 'test'];
                withPromiseResult(testArgs[0], testArgs[1]);

                return assert.eventually.deepEqual(promise, testArgs);
            });
        });

        describe('when creating an action with a withPromise definition', function() {
            var foobarPromise, barfooPromise;
            beforeEach(function() {
                // promise resolves on anotherFoo.completed
                foobarPromise = Q.promise(function(resolve) {
                    actions.foobar.failed.listen(function(){
                        resolve.apply(null, arguments);
                    }, {}); // pass empty context
                });

                // promise resolves on anotherFoo.completed
                barfooPromise = Q.promise(function(resolve) {
                    actions.barfoo.completed.listen(function(){
                        resolve.apply(null, arguments);
                    }, {}); // pass empty context
                });
            });

            it('should bind the promises as if the withPromise method had been used', function() {
                actions.foobar();
                return assert.eventually.deepEqual(foobarPromise, 'error');
            });

            it('should bind the promises even if ', function() {
                var testArgs = [1337];
                actions.barfoo(testArgs[0]);
                return assert.eventually.deepEqual(barfooPromise, testArgs);
            });


        });

    });

});
