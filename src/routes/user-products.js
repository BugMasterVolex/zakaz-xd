var router = require('express').Router();

var productService = require('../service/productService');
var userProductService = require('../service/userProductService');
var error = require('../error');
var HttpError = error.HttpError;
var log = require('../lib/log')(module);
var checkAccess = require('../middleware/checkAccess');
var loadUser = require('../middleware/loadUser');
var ACCESSES = require('../utils/accesses').ACCESSES;
var pagination = require('../utils/pagination');
var ObjectID = require('mongodb').ObjectID;

router.get('/product-users-by-product-id', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var id = new ObjectID(req.param('id'));
    var page = pagination.createMongodbPage(req);

    userProductService.findUserProductsByProductId(page, id, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/product-alluser-allid', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS | ACCESSES.MANAGE_ORDERS), function(req, res, next) {
    userProductService.findAllUserAllProducts(null, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/product-users-by-current-user', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS | ACCESSES.MANAGE_ORDERS | ACCESSES.EDIT_OWN_ORDER), function(req, res, next) {
    userProductService.findUserProductsByUserId(null, req.user._id, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/product-users-by-user-id', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS | ACCESSES.MANAGE_ORDERS), function(req, res, next) {
    var userId = new ObjectID(req.param('userId'));
    userProductService.findUserProductsByUserId(null, userId, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.post('/create-user-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var userProduct = req.body.userProduct;

    userProduct.user_id = new ObjectID(userProduct.user._id);
    delete userProduct.user;

    userProduct.product_id = new ObjectID(userProduct.product._id);
    delete userProduct.product;

    userProduct.createdDate = new Date();

    userProductService.createUserProducts([userProduct], function(err, newUserProduct) {
        if (err)
            return next(err);

        res.send(newUserProduct);
    });
});

router.post('/edit-user-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var userProduct = req.body.userProduct;

    var id = new ObjectID(userProduct._id);
    delete userProduct._id; // не изменяемое поле
    delete userProduct.createdDate; // не изменяемое поле
    delete userProduct.product; // не изменяемое поле

    userProduct.user_id = new ObjectID(userProduct.user._id);
    delete userProduct.user;

    userProductService.editUserProduct(id, userProduct, function(err, _product) {
        if (err)
            return next(err);

        res.send(_product);
    });
});

router.get('/user-product-by-id', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var id = new ObjectID(req.param('id'));

    userProductService.findOneById(id, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.post('/delete-user-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var id = new ObjectID(req.param('id'));

    userProductService.deleteUserProduct(id, function(err) {
        if (err)
            return next(err);

        res.send({});
    });
});

module.exports = router;
