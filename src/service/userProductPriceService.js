var mongodb = require('../lib/mongodb');
var userProductService = require('../service/userProductService');

function getCollection() {
	return mongodb.getDb().collection("userProductPrices");
}

function createUserProductPrices(items, callback) {
    var coll = getCollection();
    coll.insert(items, {w: 1}, function(err, results){
        if (err) {
            return callback(err);
        }
        callback(null, results.ops);
    });
}

function editUserProductPrice(id, item, callback) {
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

function findAllUserProductPricesByFilter(page, filter, callback) {
    var coll = getCollection();
    var conf = {
        sort: {created_date: 1}
    };
    if (page) {
        conf.skip = page.skip;
        conf.limit = page.limit;
    }
    coll.find(filter, conf).toArray(function(err, items) {
        if (err) {
            return callback(err);
        }

        if (page) {
            coll.find(filter).count(function(err, count) {
                if (err) {
                    return callback(err);
                }
                return callback(null, {count: count, items: items});
            });
        } else {
            return callback(null, items);
        }
    });
}

function findOneUserProductPriceByFilter(filter, callback) {
    var coll = getCollection();
    coll.findOne(filter, function(err, item) {
        if (err) {
            return callback(err);
        }

        if (!item) {
            return callback(null, null);
        }

        userProductService.findOneById(item.userProduct_id, function(err, userProduct) {
            if (err) {
                return callback(err);
            }

            item.userProduct = userProduct;
            delete item.userProduct_id;
            callback(null, item);
        });
    });
}

function findUserProductPricesByUserProductId(page, userProductId, callback) {
    findAllUserProductPricesByFilter(page, {userProduct_id: userProductId}, callback);
}

function findOneById(id, callback) {
    findOneUserProductPriceByFilter({_id: id}, callback);
}

function deleteUserProductPrice(id, callback) {
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
exports.createUserProductPrices = createUserProductPrices;
exports.editUserProductPrice = editUserProductPrice;
exports.deleteUserProductPrice = deleteUserProductPrice;
exports.findUserProductPricesByUserProductId = findUserProductPricesByUserProductId;
exports.findOneById = findOneById;