var router = require('express').Router();

var userService = require('../service/userService');
var roleService = require('../service/roleService');
var error = require('../error');
var HttpError = error.HttpError;
var log = require('../lib/log')(module);
var checkAccess = require('../middleware/checkAccess');
var loadUser = require('../middleware/loadUser');
var ACCESSES = require('../utils/accesses').ACCESSES;
var pagination = require('../utils/pagination');
var ObjectID = require('mongodb').ObjectID;

router.get('/all-users', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS | ACCESSES.MANAGE_PRODUCTS), function(req, res, next) {
    //var user = req.user;
    var page = pagination.createMongodbPage(req);
    userService.findAllUsers(page, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        }
    );
});

router.get('/user-by-id', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS | ACCESSES.MANAGE_ORDERS), function(req, res, next) {
    var userId = new ObjectID(req.param('userId'));

    userService.findWithRolesById(userId, function(err, user) {
            if (err) {
                return next(err);
            }
            res.json(user);
        }
    );
});

router.post('/create-user', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var user = req.body.user;

    if (!user.username) {
        return next(new HttpError(400, "Имя пользователя пустое"));
    }

    if (user.password !== user.repeatPassword) {
        return next(new HttpError(400, "Пароли не сопадают"));
    }

    userService.createUser({username: user.username, email: user.email}, user.password, function(err, newUser) {
        if (err)
            return next(err);

        if (user.roles && user.roles.length>0) {
            roleService.assignUserRoles(newUser._id, user.roles, function(err, userRoles) {
                if (err)
                    return next(err);

                res.send(newUser);
            });
        } else {
            res.send(newUser);
        }
    });
});

router.post('/edit-user', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var user = req.body.user;
    var userCopy = {
        email: user.email,
        username: user.username
    };
    var userId = new ObjectID(user._id);
    userService.changeUser(userId, userCopy, function(err, newUser) {
        if (err)
            return next(err);

        userCopy._id = userId;

        if (user.roles) {
            roleService.assignUserRoles(userId, user.roles, function(err, userRoles) {
                if (err)
                    return next(err);

                res.send({});
            });
        } else {
            res.send({});
        }
    });
});

router.post('/change-password', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var passData = req.body;
    var userId = new ObjectID(passData.userId);

    var newPassword = passData.newPassword;
    var repeatNewPassword = passData.repeatNewPassword;

    if (!newPassword || newPassword.length===0) {
        return next(new HttpError(400, "Пароль не может быть пустым"));
    }

    if (newPassword !== repeatNewPassword) {
        return next(new HttpError(400, "Пароли не сопадают"));
    }

    userService.changeUserPassword(userId, newPassword, function(err) {
        if (err)
            return next(err);

        res.send({});
    });
});

router.post('/lock-user', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var userId = new ObjectID(req.body.userId);

    userService.lockUser(userId, function(err) {
        if (err)
            return next(err);

        res.send({});
    });
});

router.post('/delete-user', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var userId = new ObjectID(req.body.userId);

    userService.deleteUser(userId, function(err) {
        if (err)
            return next(err);

        res.send({});
    });
});

router.post('/unlock-user', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var userId = new ObjectID(req.body.userId);

    userService.unlockUser(userId, function(err) {
        if (err)
            return next(err);

        res.send({});
    });
});

router.post('/add-user-delivery-point', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var userId = new ObjectID(req.body.userId);
    var deliveryPoint = req.body.deliveryPoint;

    userService.addUserDeliveryPoint(userId, deliveryPoint, function(err, result) {
        if (err)
            return next(err);

        res.send(result);
    });
});

router.post('/add-current-user-delivery-point', loadUser, checkAccess.getAuditor(ACCESSES.EDIT_OWN_ORDER | ACCESSES.MANAGE_USERS), function(req, res, next) {
    var deliveryPoint = req.body.deliveryPoint;
    userService.addUserDeliveryPoint(req.user._id, deliveryPoint, function(err, result) {
        if (err)
            return next(err);

        res.send(result);
    });
});

router.post('/update-user-delivery-point', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var userId = new ObjectID(req.body.userId);
    var deliveryPoint = req.body.deliveryPoint;
    var deliveryPointId = new ObjectID(deliveryPoint._id);

    userService.updateUserDeliveryPoint(userId, deliveryPointId, deliveryPoint, function(err, result) {
        if (err)
            return next(err);

        res.send(result);
    });
});

router.post('/update-current-user-delivery-point', loadUser, checkAccess.getAuditor(ACCESSES.EDIT_OWN_ORDER | ACCESSES.MANAGE_USERS), function(req, res, next) {
    var deliveryPoint = req.body.deliveryPoint;
    var deliveryPointId = new ObjectID(deliveryPoint._id);

    userService.updateUserDeliveryPoint(req.user._id, deliveryPointId, deliveryPoint, function(err, result) {
        if (err)
            return next(err);

        res.send(result);
    });
});

router.post('/remove-user-delivery-point', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var userId = new ObjectID(req.body.userId);
    var deliveryPointId = new ObjectID(req.body.deliveryPointId);

    userService.removeUserDeliveryPoint(userId, deliveryPointId, function(err, result) {
        if (err)
            return next(err);

        res.send(result);
    });
});

router.post('/remove-current-user-delivery-point', loadUser, checkAccess.getAuditor(ACCESSES.EDIT_OWN_ORDER | ACCESSES.MANAGE_USERS), function(req, res, next) {
    var deliveryPointId = new ObjectID(req.body.deliveryPointId);

    userService.removeUserDeliveryPoint(req.user._id, deliveryPointId, function(err, result) {
        if (err)
            return next(err);

        res.send(result);
    });
});


router.post('/remove-all-user-delivery-points', loadUser, checkAccess.getAuditor(ACCESSES.MANAGE_USERS), function(req, res, next) {
    var userId = new ObjectID(req.body.userId);

    userService.removeAllUserDeliveryPoints(userId, function(err, result) {
        if (err)
            return next(err);

        res.send(result);
    });
});

module.exports = router;
