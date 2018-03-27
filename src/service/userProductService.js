var mongodb = require('../lib/mongodb');
var userService = require('../service/userService');
var productService = require('../service/productService');
var ObjectID = require('mongodb').ObjectID;

function getCollection() {
	return mongodb.getDb().collection("userProducts");
}

function createUserProducts(items, callback) {
    var coll = getCollection();
    coll.insert(items, {w: 1}, function(err, results){
        if (err) {
            return callback(err);
        }
        callback(null, results.ops);
    });
}

function editUserProduct(id, item, callback) {
    var coll = getCollection();

    coll.updateOne(
        {_id : id},
        {$set: item},
        {upsert:false, w: 1, multi: false},
        function(err, upResult) {
            if (err) {
                return callback(err);
            }

            return callback(null, item);
        }
    );
}

/**
 * Обогощение данных
 */
function enrichmentUserProducts(items, callback) {
    var userIds = [];
    var productIds = [];

    var productIdSet = {};
    var userIdSet = {};
    for (var i=0; i<items.length; i++) {
        var item = items[i];
        if (!productIdSet[item.product_id.toString()]) {
            productIdSet[item.product_id.toString()] = true;
            productIds.push(item.product_id);
        }
        if (!userIdSet[item.user_id.toString()]) {
            userIdSet[item.user_id.toString()] = true;
            userIds.push(item.user_id);
        }
    }

    userService.findUsersByIds(userIds, function(err, users) {
        if (err) {
            return callback(err);
        }

        productService.findAllProductsByFilter(null, {_id: {$in : productIds}}, function(err, products) {
            if (err) {
                return callback(err);
            }

            var usersMap = {};
            if (users) {
                for (i=0; i<users.length; i++) {
                    var user = users[i];
                    usersMap[user._id.toString()] = user;
                }
            }

            var productsMap = {};
            if (products) {
                for (i=0; i<products.length; i++) {
                    var product = products[i];
                    productsMap[product._id.toString()] = product;
                }
            }

            // обогощение
            for (i=0; i<items.length; i++) {
                var item = items[i];
                item.user = usersMap[item.user_id.toString()];
                delete item.user_id;
                item.product = productsMap[item.product_id.toString()];
                delete item.product_id;
            }

            callback(null, items);
        });
    });
}

function findAllUserProductsByFilter(page, filter, callback, needenrichment) {
    var coll = getCollection();
    var conf = {
        sort: {priceDate: 1}
    };
    if (page) {
        conf.skip = page.skip;
        conf.limit = page.limit;
    }
    coll.find(filter, conf).toArray(function(err, items) {
        if (err) {
            return callback(err);
        }

        if (needenrichment === undefined) {
            enrichmentUserProducts(items, function (err, eItems) {
                if (err) {
                    return callback(err);
                }

                if (page) {
                    coll.find(filter).count(function (err, count) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, { count: count, items: eItems });
                    });
                } else {
                    return callback(null, eItems);
                }
            });
        }
        else {return callback(null, items);}
       });
}

function findOneUserProductByFilter(filter, callback) {
    var coll = getCollection();
    coll.findOne(filter, function(err, item) {
        if (err) {
            return callback(err);
        }

        if (!item) {
            return callback(null, null);
        }

        enrichmentUserProducts([item], function(err, eItems) {
            if (err) {
                return callback(err);
            }

            callback(null, eItems[0]);
        });
    });
}

function findUserProductsByProductId(page, productId, callback) {
    findAllUserProductsByFilter(page, {product_id: productId}, callback);
}

//полный список пользователь&продукт
function findAllUserAllProducts(page, callback) {
    findAllUserProductsByFilter(page, {}, callback,true);
}
/**
 * список продуктов указанного пользователя
 */
function findUserProductsByUserId(page, userId, callback) {
    findAllUserProductsByFilter(page, {user_id: userId}, callback);
}

function findOneByProductIdAndUserId(productId, userId, callback) {
    findOneUserProductByFilter({product_id: productId, user_id: userId}, callback);
}

function findOneById(id, callback) {
    findOneUserProductByFilter({_id: id}, callback);
}

function deleteUserProduct(id, callback) {
    var coll = getCollection();

    coll.deleteOne(
        {_id : id},
        function(err, res) {
            if (err) {
                return callback(err);
            }

            return callback(null, res);
        }
    );
}

exports.getCollection = getCollection;
exports.createUserProducts = createUserProducts;
exports.editUserProduct = editUserProduct;
exports.findAllUserAllProducts = findAllUserAllProducts;														
exports.findUserProductsByProductId = findUserProductsByProductId;
exports.findUserProductsByUserId = findUserProductsByUserId;
exports.findOneById = findOneById;
exports.findOneByProductIdAndUserId = findOneByProductIdAndUserId;
exports.deleteUserProduct = deleteUserProduct;
