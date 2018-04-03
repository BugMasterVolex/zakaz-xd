var mongodb = require('./lib/mongodb');
var changelog = require('./lib/changelog');
var asyncUtils = require('./utils/asyncUtils');
var userService = require('./service/userService');
var roleService = require('./service/roleService');
var measureUnitService = require('./service/measureUnitService');
var productTypeService = require('./service/productTypeService');
var orderStatusService = require('./service/orderStatusService');
var orderService = require('./service/orderService');
var userProductService = require('./service/userProductService');
var userProductPriceService = require('./service/userProductPriceService');
var Access = require('./models/access').Access;
var Role = require('./models/role').Role;
var MeasureUnit = require('./models/measureUnit').MeasureUnit;
var ProductType = require('./models/productType').ProductType;
var OrderStatus = require('./models/orderStatus').OrderStatus;
var ACCESSES = require('./utils/accesses').ACCESSES;
var ROLES = require('./utils/roles').ROLES;
var ORDER_STATUSES = require('./utils/orderStatuses').ORDER_STATUSES;

asyncUtils.eachSeries([ open, runChangelogs, close ],
    // iterator function
    function(itemFn, eachResultCallback) {
        itemFn(eachResultCallback);
    },
    function() {
    },
    // finish iterator result
    function(err) {
        if (err) {
            console.error("Error: ", err);
        } else {
            console.log("Success finishing createDb script");
        }
		//process.exit(err ? 255 : 0);
    }
);

function open(callback) {
    console.log("Open connection");
	mongodb.openConnection(callback);
}

//function dropDatabase(callback) {
//	var db = mongodb.getDb();
//	db.dropDatabase(callback);
//}

function close(callback) {
	console.log("Close connection");
	mongodb.closeConnection(callback);
}

/**
 * Нельзя изменять существующие записи changeset, можно только добавлять новые.
 */
function runChangelogs(callback) {
    console.log("Run execute changelogs");
    var changesets = [];

    // create changelog index
    changesets.push({
        changeId: 1,
        changeFn: function(changeCallback) {
            var indexes = [];
            var changelogCollection = changelog.getCollection();
            changelogCollection.createIndex( { "changeId": 1 }, { unique: true }, changeCallback);
        }
    });
    // create user index
    changesets.push({
        changeId: 2,
        changeFn: function(changeCallback) {
            var userCollection = userService.getCollection();
            userCollection.createIndex( { "username": 1 }, { unique: true }, changeCallback);
        }
    });
    // create role index
    changesets.push({
        changeId: 3,
        changeFn: function(changeCallback) {
            var roleCollection = roleService.getCollection();
            roleCollection.createIndex( { "code": 1 }, { unique: true }, changeCallback);
        }
    });

    // insert roles
    changesets.push(_createInsertNewRolesChangeset(4, [
        new Role(ROLES.ADMIN, 'Администратор'),
        new Role(ROLES.CUSTOMER, 'Заказчик')
    ]));

    // insert admin and assign role ADMIN
    changesets.push({
        changeId: 5,
        changeFn: function(changeCallback) {
            userService.createUser({username: "admin"}, "admin", function(err, newUser) {
                if (err) {
                    return changeCallback(err);
                }

                roleService.findRolesByCodes([ROLES.ADMIN], function(err, roles) {
                    if (err) {
                        return changeCallback(err);
                    }
                    roleService.assignUserRoles(newUser._id, roles, function(err) {
                        if (err) {
                            return changeCallback(err);
                        }
                        return changeCallback(null);
                    });
                });
            });
        }
    });
    // create access index
    changesets.push({
        changeId: 6,
        changeFn: function(changeCallback) {
            var coll = roleService.getAccessesCollection();
            coll.createIndex( { "code": 1, "value": 1 }, { unique: true }, changeCallback);
        }
    });
    // insert accesses
    changesets.push(_createInsertNewAccessesChangeset(7, [
        new Access('MANAGE_USERS', ACCESSES.MANAGE_USERS, 'Управление пользователями'),
        new Access('CREATE_ORDER', ACCESSES.CREATE_ORDER, 'Создание заказа'),
        new Access('VIEW_OWN_ORDERS', ACCESSES.VIEW_OWN_ORDERS, 'Просмотр своих заказов'),
        new Access('EDIT_OWN_ORDER', ACCESSES.EDIT_OWN_ORDER, 'Редактирование своего заказа'),
        new Access('REMOVE_OWN_ORDER', ACCESSES.REMOVE_OWN_ORDER, 'Удаление своего заказа'),
        new Access('VIEW_ALL_ORDER', ACCESSES.VIEW_ALL_ORDER, 'Просмотр всех заказов'),
        new Access('EDIT_ANY_ORDER', ACCESSES.EDIT_ANY_ORDER, 'Редактирование любого заказа'),
        new Access('REMOVE_ANY_ORDER', ACCESSES.REMOVE_ANY_ORDER, 'Удаление любого заказа'),
        new Access('CHANGE_OWN_PASSWORD', ACCESSES.CHANGE_OWN_PASSWORD, 'Изменение своего пароля'),
        new Access('CHANGE_OWN_ROLE_LIST', ACCESSES.CHANGE_OWN_ROLE_LIST, 'Изменение списка назначеных ролей'),
        new Access('VIEW_ROLES', ACCESSES.VIEW_ROLES, 'Просмотр всех ролей')
    ]));

    // assign accesses to role admin
    changesets.push({
        changeId: 8,
        changeFn: function(changeCallback) {
            roleService.findRolesByCodes([ROLES.ADMIN], function(err, roles) {
                if (err) {
                    return changeCallback(err);
                }
                // назначить начальные доступы на роль ADMIN
                roleService.findAccessesByValues([ACCESSES.MANAGE_USERS, ACCESSES.CHANGE_OWN_PASSWORD,
                        ACCESSES.CHANGE_OWN_ROLE_LIST, ACCESSES.VIEW_ROLES],
                    function(err, accesses) {
                        if (err) {
                            return changeCallback(err);
                        }
                        roleService.assignRoleAccesses(roles[0]._id, accesses, function(err) {
                            if (err) {
                                return changeCallback(err);
                            }
                            return changeCallback(null);
                        });
                    }
                );
            });
        }
    });

    // assign accesses to role customer
    changesets.push({
        changeId: 9,
        changeFn: function(changeCallback) {
            roleService.findRolesByCodes([ROLES.CUSTOMER], function(err, roles) {
                if (err) {
                    return changeCallback(err);
                }
                // назначить начальные доступы на роль ADMIN
                roleService.findAccessesByValues([ACCESSES.EDIT_OWN_ORDER, ACCESSES.CHANGE_OWN_PASSWORD,
                        ACCESSES.CREATE_ORDER, ACCESSES.VIEW_OWN_ORDERS],
                    function(err, accesses) {
                        if (err) {
                            return changeCallback(err);
                        }
                        roleService.assignRoleAccesses(roles[0]._id, accesses, function(err) {
                            if (err) {
                                return changeCallback(err);
                            }
                            return changeCallback(null);
                        });
                    }
                );
            });
        }
    });

    function _createInsertNewAccessesChangeset(chId, accesses) {
        return {
            changeId: chId,
            changeFn: function(changeCallback) {
                roleService.createAccesses(accesses, function(err, insertedAccesses) {
                    if (err) {
                        return changeCallback(err);
                    }
                    return changeCallback(null);
                });
            }
        }
    }

    changesets.push(_createInsertNewAccessesChangeset(10, [
        new Access('MANAGE_ORDERS', ACCESSES.MANAGE_ORDERS, 'Управление заказами'),
        new Access('MANAGE_PRODUCTS', ACCESSES.MANAGE_PRODUCTS, 'Управление товарами')
    ]));

    function _createInsertNewRolesChangeset(chId, roles) {
        return {
            changeId: chId,
            changeFn: function(changeCallback) {
                roleService.createRoles(roles, function(err, newRoles) {
                    if (err) {
                        return changeCallback(err);
                    }
                    return changeCallback(null);
                });
            }
        }
    }

    function _createInsertNewMeasureUnitsChangeset(chId, measureUnits) {
        return {
            changeId: chId,
            changeFn: function(changeCallback) {
                measureUnitService.createMeasureUnits(measureUnits, function(err, items) {
                    if (err) {
                        return changeCallback(err);
                    }
                    return changeCallback(null);
                });
            }
        }
    }

    // insert roles order and product manager
    changesets.push(_createInsertNewRolesChangeset(11, [
        new Role(ROLES.ORDERS_MANAGER, 'Менеджер заказов'),
        new Role(ROLES.PRODUCTS_MANAGER, 'Менеджер товаров')
    ]));

    function _createAssignRoleAccessesChangeset(chId, roleCode, accessValues) {
        return {
            changeId: chId,
            changeFn: function(changeCallback) {
                roleService.findRolesByCodes([roleCode], function(err, roles) {
                    if (err) {
                        return changeCallback(err);
                    }
                    // назначить доступы
                    roleService.findAccessesByValues(accessValues,
                        function(err, accesses) {
                            if (err) {
                                return changeCallback(err);
                            }
                            roleService.assignRoleAccesses(roles[0]._id, accesses, function(err) {
                                if (err) {
                                    return changeCallback(err);
                                }
                                return changeCallback(null);
                            });
                        }
                    );
                });
            }
        }
    }

    changesets.push(_createAssignRoleAccessesChangeset(12, ROLES.ORDERS_MANAGER, [ACCESSES.MANAGE_ORDERS]));
    changesets.push(_createAssignRoleAccessesChangeset(13, ROLES.PRODUCTS_MANAGER, [ACCESSES.MANAGE_PRODUCTS]));

    changesets.push(_createInsertNewMeasureUnitsChangeset(14, [
        new MeasureUnit('KG', 'кг'),
        new MeasureUnit('PIECE', 'штука'),
        new MeasureUnit('PALLET', 'палет'),
        new MeasureUnit('BOX', 'коробка')
    ]));

    function _createInsertNewProductTypesChangeset(chId, items) {
        return {
            changeId: chId,
            changeFn: function(changeCallback) {
                productTypeService.createProductTypes(items, function(err, _items) {
                    if (err) {
                        return changeCallback(err);
                    }
                    return changeCallback(null);
                });
            }
        }
    }

    // вес/штука
    changesets.push(_createInsertNewProductTypesChangeset(15, [
        new ProductType('WEIGHT', 'вес'),
        new ProductType('PIECE', 'штука')
    ]));

    // create UserProduct index
    changesets.push({
        changeId: 16,
        changeFn: function(changeCallback) {
            var coll = userProductService.getCollection();
            coll.createIndex( { "user_id": 1, "product_id": 1 }, { unique: true }, changeCallback);
        }
    });

    // create UserRole index
    changesets.push({
        changeId: 17,
        changeFn: function(changeCallback) {
            var coll = roleService.getUserRolesCollection();
            coll.createIndex( { "user_id": 1, "role_id": 1 }, { unique: true }, changeCallback);
        }
    });

    // create RoleAccess index
    changesets.push({
        changeId: 18,
        changeFn: function(changeCallback) {
            var coll = roleService.getRoleAccessesCollection();
            coll.createIndex( { "role_id": 1, "access_id": 1 }, { unique: true }, changeCallback);
        }
    });

    // create UserProductPrice.priceDate index
    changesets.push({
        changeId: 19,
        changeFn: function(changeCallback) {
            var coll = userProductPriceService.getCollection();
            coll.createIndex( { "priceDate": 1, "userPoduct_id": 1 }, { unique: true }, changeCallback);
        }
    });

    // create OrderStatus.code index
    changesets.push({
        changeId: 20,
        changeFn: function(changeCallback) {
            var coll = orderStatusService.getCollection();
            coll.createIndex( { "code": 1 }, { unique: true }, changeCallback);
        }
    });

    function _createInsertNewOrderStatusesChangeset(chId, items) {
        return {
            changeId: chId,
            changeFn: function(changeCallback) {
                orderStatusService.createOrderStatuses(items, function(err, _items) {
                    if (err) {
                        return changeCallback(err);
                    }
                    return changeCallback(null);
                });
            }
        }
    }

    // Создан, Активен, Подтвержден, Отгружен, Закрыт.
    changesets.push(_createInsertNewOrderStatusesChangeset(21, [
        new OrderStatus(ORDER_STATUSES.CREATED, 'Создан'),
        new OrderStatus(ORDER_STATUSES.ACTIVE, 'Активен'),
        new OrderStatus(ORDER_STATUSES.APPROVED, 'Подтвержден'),
        new OrderStatus(ORDER_STATUSES.SHIPPED, 'Отгружен'),
        new OrderStatus(ORDER_STATUSES.CLOSED, 'Закрыт')
    ]));

	
    changesets.push({
        changeId: 22,
        changeFn: function(changeCallback) {
            var coll = orderService.getCollection();
            coll.createIndex( { "number": 1 }, { unique: true }, changeCallback);
        }
    });

    //Нельзя вводить ограничение номера заказа индексом, не позволит иметь 
    //одинаковые номера заказа у разных клиентов, неоходимо создать механизм 
    //контроля номера заказа клиента в рамках года будем считать что номер 
    //заказа уникален в связке клиент&год

    changesets.push({
        changeId: 23,
        changeFn: function(changeCallback) {
            var coll = orderService.getCollection();
            coll.dropIndex( "number", changeCallback);
        }
    });

    //Но индекс все же нужен по полю number
    changesets.push({
        changeId: 24,
        changeFn: function(changeCallback) {
            var coll = orderService.getCollection();
            coll.createIndex( { "number": 1 }, null, changeCallback);
        }
    });

    changelog.executeAllChangesets(changesets, callback);
}


