var mongodb = require('../lib/mongodb');
var orderStatusService = require('../service/orderStatusService');
var userService = require('../service/userService');
var userProductService = require('../service/userProductService');
var productService = require('../service/productService');
var ORDER_STATUSES = require('../utils/orderStatuses').ORDER_STATUSES;
var ObjectID = require('mongodb').ObjectID;

function getCollection() {
	return mongodb.getDb().collection("orders");
}

function createOrder(item, callback) {
    orderStatusService.findOneByCode(ORDER_STATUSES.CREATED, function(err, status) {
        if (err) {
            return callback(err);
        }

        item.status_id = status._id;

        var coll = getCollection();
        coll.insert(item, function(err, results){
            if (err) {
                return callback(err);
            }
            return callback(null, item);
        });

    });
}

function deleteOrder(id, callback) {
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

function editOrder(id, item, callback) {
    var coll = getCollection();

    // статус не должен менятся при изменении. Статусы меняются отдельными операцями.
    if (item.status_id) {
        delete item.status_id;
    }
    if (item.status) {
        delete item.status;
    }

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

function changeOrderStatus(id, orderStatusCode, callback) {
    var coll = getCollection();

    orderStatusService.findOneByCode(orderStatusCode, function(err, status) {
        if (err) {
            return callback(err);
        }
        coll.updateOne(
            {_id : id},
            {$set: {status_id: status._id}},
            {upsert:false, w: 1, multi: false},
            function(err, upResult) {
                if (err) {
                    return callback(err);
                }

                return callback(null, status);
            }
        );
    });
}

/**
 * Обогощение данных
 */
function enrichmentOrders(orders, callback) {
    orderStatusService.findAllOrderStatuses(function(err, allStatuses) {
        if (err) {
            return callback(err);
        }

        userService.findAllUsers(null, function(err, allUsers) {
            if (err) {
                return callback(err);
            }

            var statusesMap = {};
            if (allStatuses) {
                for (var i=0; i<allStatuses.length; i++) {
                    var status = allStatuses[i];
                    statusesMap[status._id.toString()] = status;
                }
            }

            var usersMap = {};
            if (allUsers) {
                for (var i=0; i<allUsers.length; i++) {
                    var user = allUsers[i];
                    usersMap[user._id.toString()] = user;
                }
            }

            // обогощение
            for (var i=0; i<orders.length; i++) {
                var order = orders[i];
                if (order.status_id) {
                    order.status = statusesMap[order.status_id.toString()];
                    delete order.status_id;
                }
                order.author = usersMap[order.author_id.toString()];
                delete order.author_id;
            }

            callback(null, orders);
        });


    });
}

function enrichmentOneOrder(order, callback) {
    productService.findAllProducts(null, function(err, allProducts) {
        if (err) {
            return callback(err);
        }

        orderStatusService.findAllOrderStatuses(function(err, allStatuses) {
            if (err) {
                return callback(err);
            }

            userService.findById(order.author_id, function(err, author) {
                if (err) {
                    return callback(err);
                }

                if (!author) {
                    return callback(new Error("Автор не найден author id " + order.author_id));
                }

                userService.findAllUsers(null, function(err, allUsers) {

                    var statusesMap = {};
                    if (allStatuses) {
                        for (var i=0; i<allStatuses.length; i++) {
                            var status = allStatuses[i];
                            statusesMap[status._id.toString()] = status;
                        }
                    }

                    var productsMap = {};
                    if (allProducts) {
                        for (var i=0; i<allProducts.length; i++) {
                            var product = allProducts[i];
                            productsMap[product._id.toString()] = product;
                        }
                    }

                    var allUsersMap = {};
                    if (allUsers) {
                        for (var i=0; i<allUsers.length; i++) {
                            var us = allUsers[i];
                            allUsersMap[us._id.toString()] = us;
                        }
                    }

                    order.author = author;
                    delete order.author_id;

                    if (order.status_id) {
                        order.status = statusesMap[order.status_id.toString()];
                        delete order.status_id;
                    }

                    // найти точку доставки
                    if (order.authorDeliveryPoint_id && order.author.deliveryPoints) {
                        for(var j=0; j<order.author.deliveryPoints.length; ++j) {
                            var dp = order.author.deliveryPoints[j];
                            if (order.authorDeliveryPoint_id.toString()===dp._id.toString()) {
                                order.authorDeliveryPoint = dp;
                                delete order.authorDeliveryPoint_id;
                                break;
                            }
                        }
                    }

                    // продукты заказа
                    if (order.authorProducts) {
                        for(var j=0; j<order.authorProducts.length; ++j) {
                            var ap = order.authorProducts[j];
                            if (ap.product_id) { // TODO: иногда падало: видимо на старых данных, поэтому проверку оставляю
                                var ep = productsMap[ap.product_id.toString()];
                                if (ep) {
                                    ap.product = ep;
                                    delete ap.product_id;
                                }
                            }
                        }
                    }

                    // комментарии заказа
                    if (order.comments) {
                        for(var j=0; j<order.comments.length; ++j) {
                            var cm = order.comments[j];
                            if (cm.author_id) { // TODO: на всякий случай :)
                                var us = allUsersMap[cm.author_id.toString()];
                                if (us) {
                                    cm.author = us;
                                    delete cm.author_id;
                                }
                            }
                        }
                    }

                    callback(null, order);
                });


            });


        });
    });
}

function findAllOrdersByFilter(page, filter, callback) {
    var coll = getCollection();
    var conf = {
        sort: {createdDate: -1, author_id: -1}
    };
    if (page) {
        conf.skip = page.skip;
        conf.limit = page.limit;
    }
    coll.find(filter, conf).toArray(function(err, orders) {
        if (err) {
            return callback(err);
        }

        enrichmentOrders(orders, function(err, eOrders) {
            if (err) {
                return callback(err);
            }

            coll.count(filter, function(err, count) {
                if (err) {
                    return callback(err);
                }
                return callback(null, {count: count, items: eOrders});
            });
        });
    });
}

function createDateRangeFilter(startDate, endDate) {
	if (!startDate && !endDate) {
		return null;
	}
	var filter = {};
	if (startDate) {
		filter.$gte = startDate;
	}
	if (endDate) {
		filter.$lte = endDate;
	}
	return filter;
}

function findAllOrders(page, searchParameters, callback) {
	var filter = {};
	var deliveryDateFilter = createDateRangeFilter(searchParameters.deliveryDate.start,
		   	searchParameters.deliveryDate.end);
	if (deliveryDateFilter) {
		filter.deliveryDate = deliveryDateFilter;	
	}	

    var createdDateFilter = createDateRangeFilter(searchParameters.createdDate.start,
        searchParameters.createdDate.end);
    if (createdDateFilter) {
        filter.createdDate = createdDateFilter;
    }
    if (searchParameters.status_id) {
        orderStatusService.findOneByCode(searchParameters.status_id.code, function (err, result) {
            if (err) {
                return callback(new Error("Статус неопределен " + searchParameters.status_id.code));
            }
            filter.status_id = result._id;
            findAllOrdersByFilter(page, filter, callback);
        });

    } else {
        findAllOrdersByFilter(page, filter, callback);
    }
}

function findAllOrdersByAuthorId(page, authorId, searchParameters, callback) {
	var filter = {author_id: authorId};
	var deliveryDateFilter = createDateRangeFilter(searchParameters.deliveryDate.start,
		   	searchParameters.deliveryDate.end);
	if (deliveryDateFilter) {
		filter.deliveryDate = deliveryDateFilter;	
	}

	var createdDateFilter = createDateRangeFilter(searchParameters.createdDate.start,
		   	searchParameters.createdDate.end);
	if (createdDateFilter) {
		filter.createdDate = createdDateFilter;	
	}
    findAllOrdersByFilter(page, filter, callback);
}

function findOneOrderByFilter(filter, callback) {
    var coll = getCollection();
    coll.findOne(filter, function(err, order) {
        if (err) {
            return callback(err);
        }

        if (!order) {
            return callback(null, null);
        }

        enrichmentOneOrder(order, function(err, eOrder) {
            if (err) {
                return callback(err);
            }

            return callback(null, eOrder);
        });
    });
}

function findOneByIdAndAuthorId(id, authorId, callback) {
    findOneOrderByFilter({_id: id, author_id: authorId}, callback);
}

//для поиска заказов от клиента с одним номером в пределах года
function findOneByYearAndNumberAndAuthorId(item, callback) {
    findOneOrderByFilter({createdDate:{ $gt: new Date(item.createdDate.getFullYear(),0),
    $lte: new Date(item.createdDate.getFullYear()+1,0)}, author_id: item.author_id, number: item.number}, callback);
}

function findOneById(id, callback) {
    findOneOrderByFilter({_id: id}, function(err, order) {
        if (err) {
            return callback(err);
        }
        if (!order) {
            return callback(new Error("Заказ не найден " + id));
        }
        return callback(null, order);
    });
}

/// -------------------- order product -------------------------------------------------

function findOrderByIdAndOrderProductId(orderId, orderProductId, callback) {
    var coll = getCollection();
    coll.find({_id: orderId}, { authorProducts: { $elemMatch: { _id: orderProductId } } }).toArray(function(err, result) {
        if (err) {
            return callback(err);
        }

        return callback(null, result);
    });
}

function removeOrderProduct(orderId, orderProductId, callback) {
    var coll = getCollection();

    coll.update(
        {_id : orderId},
        { $pull: { authorProducts: { _id: orderProductId } } },
        { multi: false },
        function(err, res) {
            if (err) {
                return callback(err);
            }

            return callback(null, res);
        }
    );
}

function removeAllOrderProducts(orderId, callback) {
    var coll = getCollection();

    coll.update(
        {_id : orderId},
        { $pull: { authorProducts: {} } },
        { multi: true },
        function(err, res) {
            if (err) {
                return callback(err);
            }

            return callback(null, res);
        }
    );
}

/**
 quantity	количество заказаное
 deliveryQuantity	количество отгруженое

 price	цена за единицу с НДС
 vat	НДС за единицу

 sum	стоимость
 sumVat	сумма НДС
 * @param orderId
 * @param orderProduct
 * @param callback
 */
function addOrderProduct(orderId, orderProduct, callback) {
    var coll = getCollection();

    // TODO: необходимо проверить принадлежит ли продукт автору заказа
    findOneById(orderId, function(err, order){
        if (err) {
            return callback(err);
        }

        userProductService.findOneByProductIdAndUserId(orderProduct.product_id, order.author._id, function(err, userProduct) {
            if (err) {
                return callback(err);
            }

            if (!userProduct) {
                return callback(new Error("Указанный продукт " + orderProduct.product_id
                + " не принадлежит заказчику товара " + order.author._id));
            }

            orderProduct._id = new ObjectID(); // generate id

            coll.update(
                { _id: orderId },
                { $push: { authorProducts: orderProduct } },
                function(err, result) {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null, order);
                }
            );

        });
    });

}

function updateOrderProduct(orderId, orderProductId, orderProduct, callback) {
    var coll = getCollection();

    /*
     quantity	количество заказаное
     deliveryQuantity	количество отгруженое

     price	цена за единицу с НДС
     vat	НДС за единицу

     sum	стоимость
     sumVat	сумма НДС
     */
    coll.update(
        { _id: orderId, authorProducts: {$elemMatch: {_id: orderProductId}} },
        { $set: {
            "authorProducts.$.product_id" : orderProduct.product_id,
            "authorProducts.$.quantity" : orderProduct.quantity,
            "authorProducts.$.deliveryQuantity" : orderProduct.deliveryQuantity,
            "authorProducts.$.price" : orderProduct.price,
            "authorProducts.$.vat" : orderProduct.vat,
            "authorProducts.$.sum" : orderProduct.sum,
            "authorProducts.$.sumVat" : orderProduct.sumVat
        }},
        function(err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result);
        }
    );
}

/// -------------------- order comment -------------------------------------------------
function removeOrderComment(orderId, commentId, callback) {
    var coll = getCollection();

    coll.update(
        {_id : orderId},
        { $pull: { comments: { _id: commentId } } },
        { multi: false },
        function(err, res) {
            if (err) {
                return callback(err);
            }

            return callback(null, res);
        }
    );
}

function addOrderComment(orderId, comment, callback) {
    var coll = getCollection();

    comment._id = new ObjectID(); // generate id

    coll.update(
        { _id: orderId },
        { $push: { comments: comment } },
        function(err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, comment);
        }
    );

}

function updateOrderComment(orderId, commentId, orderComment, callback) {
    var coll = getCollection();

    coll.update(
        { _id: orderId, authorProducts: {$elemMatch: {_id: commentId}} },
        { $set: {
            "authorProducts.$.text" : orderComment.text
        }},
        function(err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result);
        }
    );
}

exports.getCollection = getCollection;
exports.findAllOrders = findAllOrders;
exports.findAllOrdersByAuthorId = findAllOrdersByAuthorId;
exports.findOneByIdAndAuthorId = findOneByIdAndAuthorId;
exports.findOneById = findOneById;
exports.createOrder = createOrder;
exports.deleteOrder = deleteOrder;
exports.editOrder = editOrder;
exports.changeOrderStatus = changeOrderStatus;
exports.findOneByYearAndNumberAndAuthorId = findOneByYearAndNumberAndAuthorId;

// order product
exports.removeOrderProduct = removeOrderProduct;
exports.removeAllOrderProducts = removeAllOrderProducts;
exports.addOrderProduct = addOrderProduct;
exports.updateOrderProduct = updateOrderProduct;

// order comment
exports.removeOrderComment = removeOrderComment;
exports.addOrderComment = addOrderComment;
exports.updateOrderComment = updateOrderComment;



