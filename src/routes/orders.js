var router = require('express').Router();

var orderService = require('../service/orderService');
var orderStatusService = require('../service/orderStatusService');
var userService = require('../service/userService');
var error = require('../error');
var HttpError = error.HttpError;
var log = require('../lib/log')(module);
var checkAccess = require('../middleware/checkAccess');
var loadUser = require('../middleware/loadUser');
var ACCESSES = require('../utils/accesses').ACCESSES;
var ORDER_STATUSES = require('../utils/orderStatuses').ORDER_STATUSES;
var pagination = require('../utils/pagination');
var ObjectID = require('mongodb').ObjectID;

router.post('/all-orders', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS), function(req, res, next) {
    var page = pagination.createMongodbPageFromRequestBody(req.body);
    var request = req.body.req;
	if (request.deliveryDate.start) {
		request.deliveryDate.start = new Date(request.deliveryDate.start);
	}
	if (request.deliveryDate.end) {
		request.deliveryDate.end = new Date(request.deliveryDate.end);
	}

	if (request.createdDate.start) {
		request.createdDate.start = new Date(request.createdDate.start);
	}
	if (request.createdDate.end) {
		request.createdDate.end = new Date(request.createdDate.end);
	}
    orderService.findAllOrders(page, request, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.post('/user-orders', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
	var page = pagination.createMongodbPageFromRequestBody(req.body);
    var request = req.body.req;
	if (request.deliveryDate.start) {
		request.deliveryDate.start = new Date(request.deliveryDate.start);
	}
	if (request.deliveryDate.end) {
		request.deliveryDate.end = new Date(request.deliveryDate.end);
	}
	if (request.createdDate.start) {
		request.createdDate.start = new Date(request.createdDate.start);
	}
	if (request.createdDate.end) {
		request.createdDate.end = new Date(request.createdDate.end);
	}

    orderService.findAllOrdersByAuthorId(page, req.user._id, request, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/order-by-id', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var orderId = new ObjectID(req.param('orderId'));

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        orderService.findOneById(orderId, function(err, result) {
                if (err) {
                    return next(err);
                }
                res.json(result);
            }
        );
    } else {
        checkCurrentUserIsOrderAuthor(orderId, req, res, next, function() {
            orderService.findOneById(orderId, function(err, result) {
                    if (err) {
                        return next(err);
                    }
                    res.json(result);
                }
            );
        });
    }
});

router.get('/all-order-statuses', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    orderStatusService.findAllOrderStatuses(function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.post('/create-order', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var order = req.body.order;

    if (!order.number) {
        return next(new HttpError(400, "Поле номер пустое"));
    }

    if (!order.authorDeliveryPoint) {
        return next(new HttpError(400, "Поле точка доставки пустое"));
    }

    if (!order.deliveryDate) {
        return next(new HttpError(400, "Поле Дата доставки пустое"));
    }

    order.deliveryDate = new Date(order.deliveryDate);
    order.authorDeliveryPoint_id = new ObjectID(order.authorDeliveryPoint._id);
    delete order.authorDeliveryPoint;

    order.createdDate = new Date();
    order.author_id = req.user._id;
    if (!isMoreOrEqualDayOfNow(order.deliveryDate)) {
        return next(new HttpError(400, "Дата доставки не может быть меньше текущей даты"));
    }

    orderService.findOneByYearAndNumberAndAuthorId(order, function (err, foundOrder) {
        if (err)
                 return next(err);
         if (foundOrder)
             return next(new HttpError(400, "Документ с таким номером уже создавался в этом году"));


        orderService.createOrder(order, function (err, newOrder) {
            if (err)
                return next(err);

            res.send(order);
        });
    });
});

function isMoreOrEqualDayOfNow(compareDate) {
    var nowDate = new Date();
    if (compareDate.getFullYear() < nowDate.getFullYear()) {
        return false;
    }
    if (compareDate.getMonth() < nowDate.getMonth()) {
        return false;
    }
    if (compareDate.getDate() < nowDate.getDate()) {
        return false;
    }
    return true;
}

function editOrder(id, order, req, res, next) {
    delete order._id;
    delete order.createdDate;
    delete order.author;
    if (order.author) {
        delete order.author;
    }

    if (!order.number) {
        return next(new HttpError(400, "Поле номер пустое"));
    }

    if (!order.authorDeliveryPoint) {
        return next(new HttpError(400, "Поле точка доставки пустое"));
    }

    if (!order.deliveryDate) {
        return next(new HttpError(400, "Поле Дата доставки пустое"));
    }

    order.deliveryDate = new Date(order.deliveryDate);

    if (!isMoreOrEqualDayOfNow(order.deliveryDate)) {
        return next(new HttpError(400, "Дата доставки не может быть меньше текущей даты"));
    }

    order.authorDeliveryPoint_id = new ObjectID(order.authorDeliveryPoint._id);
    delete order.authorDeliveryPoint;

    orderService.editOrder(id, order, function(err, _order) {
        if (err)
            return next(err);

        res.send(_order);
    });
}

function changeStatus(id, newCode, currentCheckedCode, req, res, next) {

    if (currentCheckedCode) {
        orderService.findOneById(id, function(err, result) {
            if (err) {
                return next(err);
            }

            if (result.status.code !== currentCheckedCode) {
                return next(new HttpError(400, "Перевести заказ в состояние " + newCode
                + " возможно только если заказ в сотоянии " + currentCheckedCode));
            }

            orderService.changeOrderStatus(id, newCode, function(err, status) {
                if (err)
                    return next(err);

                res.send(status);
            });
        });
    } else {
        orderService.changeOrderStatus(id, newCode, function(err, status) {
            if (err)
                return next(err);

            res.send(status);
        });
    }
}

function checkCurrentUserIsOrderAuthor(orderId, req, res, next, successCallback) {
    orderService.findOneById(orderId, function(err, dbOrder) {
            if (err) {
                return next(err);
            }
            if (!dbOrder) {
                return next(new HttpError(400, "Заказ не найден ID " + orderId));
            }
            if (dbOrder.author._id.toString() !== req.user._id.toString()) {
                return next(new HttpError(400, "Вы не имеете прав изменять не принадлежащий вам заказ"));
            }

            successCallback(dbOrder);
        }
    );
}

router.post('/edit-order', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var order = req.body.order;
    var id = new ObjectID(order._id);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        editOrder(id, order, req, res, next);
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(id, req, res, next, function(dbOrder) {
            // автор заказа может удалить заказ только в статусе создан
            // проверим статус
            if (dbOrder.status.code !== ORDER_STATUSES.CREATED) {
                return next(new HttpError(400, "Вы не имеете право редактировать заказ в статусе '" + dbOrder.status.title + "'"));
            }
            editOrder(id, order, req, res, next);
        });
    }
});

router.post('/delete-order', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var id = new ObjectID(req.param('id'));

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        orderService.deleteOrder(id, function(err, result) {
            if (err)
                return next(err);

            res.send(result);
        });
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(id, req, res, next, function(dbOrder) {

            // автор заказа может удалить заказ только в статусе создан
            // проверим статус
            if (dbOrder.status.code !== ORDER_STATUSES.CREATED) {
                return next(new HttpError(400, "Вы не имеете право удалять заказ в статусе '" + dbOrder.status.title + "'"));
            }

            orderService.deleteOrder(id, function(err, result) {
                if (err)
                    return next(err);

                res.send(result);
            });
        });
    }
});

// +++++++++++++++ change order statuses
router.post('/activate-order', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var id = new ObjectID(req.body.orderId);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        changeStatus(id, ORDER_STATUSES.ACTIVE, ORDER_STATUSES.CREATED, req, res, next);
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(id, req, res, next, function() {
            changeStatus(id, ORDER_STATUSES.ACTIVE, ORDER_STATUSES.CREATED, req, res, next);
        });
    }
});

router.post('/approve-order', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS), function(req, res, next) {
    var id = new ObjectID(req.body.orderId);
    changeStatus(id, ORDER_STATUSES.APPROVED, ORDER_STATUSES.ACTIVE, req, res, next);
});
router.post('/ship-order', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS), function(req, res, next) {
    var id = new ObjectID(req.body.orderId);
    changeStatus(id, ORDER_STATUSES.SHIPPED, ORDER_STATUSES.APPROVED, req, res, next);
});
router.post('/close-order', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS), function(req, res, next) {
    var id = new ObjectID(req.body.orderId);
    // закрыть заказ можно из любого статуса
    changeStatus(id, ORDER_STATUSES.CLOSED, null, req, res, next);
});

// ++++++++++++++++++ order product

function addOrderProduct(orderId, orderProduct, req, res, next) {
    if (!orderProduct.product) {
        return next(new HttpError(400, "Поле продукт пустое"));
    }

    orderProduct.product_id = new ObjectID(orderProduct.product._id);
    delete orderProduct.product;

    orderProduct.createdDate = new Date();

    orderService.addOrderProduct(orderId, orderProduct, function(err, results) {
        if (err)
            return next(err);

        res.send(results);
    });
}

function updateOrderProduct(orderId, orderProduct, req, res, next) {
    if (!orderProduct.product) {
        return next(new HttpError(400, "Поле продукт пустое"));
    }

    orderProduct.product_id = new ObjectID(orderProduct.product._id);
    delete orderProduct.product;

    if (!orderProduct._id) {
        return next(new HttpError(400, "Поле _id не найдено"));
    }

    var orderProductId = new ObjectID(orderProduct._id);

    orderService.updateOrderProduct(orderId, orderProductId, orderProduct, function(err, results) {
        if (err)
            return next(err);

        res.send(results);
    });
}

router.post('/add-order-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var orderProduct = req.body.orderProduct;
    var orderId = new ObjectID(req.body.orderId);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        addOrderProduct(orderId, orderProduct, req, res, next);
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(orderId, req, res, next, function(dbOrder) {
            // проверим статус
            if (dbOrder.status.code !== ORDER_STATUSES.CREATED) {
                return next(new HttpError(400, "Вы не имеете право менять состав продуктов заказа в статусе '" + dbOrder.status.title + "'"));
            }
            addOrderProduct(orderId, orderProduct, req, res, next);
        });
    }
});

router.post('/remove-order-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    if (!req.body.orderProductId) {
        return next(new HttpError(400, "Parameter orderProductId not found"));
    }

    var orderProductId = new ObjectID(req.body.orderProductId);
    var orderId = new ObjectID(req.body.orderId);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        orderService.removeOrderProduct(orderId, orderProductId, function(err, results) {
            if (err)
                return next(err);

            res.send(results);
        });
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(orderId, req, res, next, function(dbOrder) {
            // проверим статус
            if (dbOrder.status.code !== ORDER_STATUSES.CREATED) {
                return next(new HttpError(400, "Вы не имеете право менять состав продуктов заказа в статусе '" + dbOrder.status.title + "'"));
            }
            orderService.removeOrderProduct(orderId, orderProductId, function(err, results) {
                if (err)
                    return next(err);

                res.send(results);
            });
        });
    }
});

router.post('/update-order-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var orderProduct = req.body.orderProduct;
    if (!orderProduct) {
        return next(new HttpError(400, "Parameter orderProduct not found"));
    }
    var orderId = new ObjectID(req.body.orderId);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        updateOrderProduct(orderId, orderProduct, req, res, next);
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(orderId, req, res, next, function(dbOrder) {
            // проверим статус
            if (dbOrder.status.code !== ORDER_STATUSES.CREATED) {
                return next(new HttpError(400, "Вы не имеете право менять состав продуктов заказа в статусе '" + dbOrder.status.title + "'"));
            }
            updateOrderProduct(orderId, orderProduct, req, res, next);
        });
    }
});

router.post('/remove-all-order-products', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var orderId = new ObjectID(req.body.orderId);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        orderService.removeAllOrderProducts(orderId, function(err, results) {
            if (err)
                return next(err);

            res.send(results);
        });
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(orderId, req, res, next, function(dbOrder) {
            // проверим статус
            if (dbOrder.status.code !== ORDER_STATUSES.CREATED) {
                return next(new HttpError(400, "Вы не имеете право менять состав продуктов заказа в статусе '" + dbOrder.status.title + "'"));
            }
            orderService.removeAllOrderProducts(orderId, function(err, results) {
                if (err)
                    return next(err);

                res.send(results);
            });
        });
    }
});

// ++++++++++++++++++ order comment

function updateOrderComment(orderId, orderComment, req, res, next) {
    if (!orderComment._id) {
        return next(new HttpError(400, "Поле _id не найдено"));
    }

    var orderCommentId = new ObjectID(orderComment._id);

    orderService.updateOrderComment(orderId, orderCommentId, orderComment, function(err, results) {
        if (err)
            return next(err);

        res.send(results);
    });
}

router.post('/add-order-comment', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var orderComment = req.body.comment;
    var orderId = new ObjectID(req.body.orderId);

    orderComment.createdDate = new Date();
    orderComment.author_id = req.user._id;

    orderService.addOrderComment(orderId, orderComment, function(err, results) {
        if (err)
            return next(err);

        res.send(results);
    });
});

router.post('/remove-order-comment', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var orderCommentId = new ObjectID(req.body.orderCommentId);
    var orderId = new ObjectID(req.body.orderId);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        orderService.removeOrderComment(orderId, orderCommentId, function(err, results) {
            if (err)
                return next(err);

            res.send(results);
        });
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(orderId, req, res, next, function() {
            orderService.removeOrderComment(orderId, orderCommentId, function(err, results) {
                if (err)
                    return next(err);

                res.send(results);
            });
        });
    }
});

router.post('/update-order-comment', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    var orderComment = req.body.comment;
    if (!orderComment) {
        return next(new HttpError(400, "Parameter comment not found"));
    }
    var orderId = new ObjectID(req.body.orderId);

    if (userService.isAuthorize(req.user, ACCESSES.MANAGE_ORDERS)) {
        updateOrderComment(orderId, orderComment, req, res, next);
    } else {
        // TODO: check author
        checkCurrentUserIsOrderAuthor(orderId, req, res, next, function() {
            updateOrderComment(orderId, orderComment, req, res, next);
        });
    }
});

module.exports = router;
