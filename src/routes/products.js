var router = require('express').Router();

var productService = require('../service/productService');
var measureUnitService = require('../service/measureUnitService');
var productTypeService = require('../service/productTypeService');
var error = require('../error');
var HttpError = error.HttpError;
var log = require('../lib/log')(module);
var checkAccess = require('../middleware/checkAccess');
var loadUser = require('../middleware/loadUser');
var ACCESSES = require('../utils/accesses').ACCESSES;
var pagination = require('../utils/pagination');
var ObjectID = require('mongodb').ObjectID;

router.get('/all-products', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var page = pagination.createMongodbPage(req);
    productService.findAllProducts(page, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/product-by-id', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var id = new ObjectID(req.param('id'));

    productService.findOneById(id, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/all-measure-units', loadUser, function(req, res, next) {
    measureUnitService.findAllMeasureUnits(function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/all-product-types', loadUser, function(req, res, next) {
    productTypeService.findAllProductTypes(function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.post('/create-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var product = req.body.product;

    if (!product.measureUnit) {
        return next(new HttpError(400, "Поле единица измерения пустое"));
    }

    if (!product.title) {
        return next(new HttpError(400, "Поле наименование пустое"));
    }

    product.measureUnit_id = new ObjectID(product.measureUnit._id);
    delete product.measureUnit;

    if (product.type) {
        product.type_id = new ObjectID(product.type._id);
        delete product.type;
    }

    product.createdDate = new Date();

    productService.createProduct(product, function(err, newProduct) {
        if (err)
            return next(err);

        res.send(newProduct);
    });
});

router.post('/edit-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var product = req.body.product;

    var id = new ObjectID(product._id);
    delete product._id;
    delete product.createdDate;

    if (!product.measureUnit) {
        return next(new HttpError(400, "Поле единица измерения пустое"));
    }

    if (!product.title) {
        return next(new HttpError(400, "Поле наименование пустое"));
    }

    product.measureUnit_id = new ObjectID(product.measureUnit._id);
    delete product.measureUnit;

    if (product.type) {
        product.type_id = new ObjectID(product.type._id);
        delete product.type;
    } else {
        product.type_id = null;
    }

    productService.editProduct(id, product, function(err, _product) {
        if (err)
            return next(err);

        res.send({});
    });
});

router.post('/delete-product', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    var id = new ObjectID(req.param('id'));

    productService.deleteProduct(id, function(err) {
        if (err)
            return next(err);

        res.send({});
    });
});

module.exports = router;
