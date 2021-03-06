angular.module('zakaz-xd.resources.users-resource', [
])

    .factory('UsersResource', ['$q', '$http', function ($q, $http) {
        var startUrl='/users';
        return {
            createUser: function (newUser) {
                return $http.post(startUrl + '/create-user', {user: newUser});
            },
            editUser: function (user) {
                return $http.post(startUrl + '/edit-user', {user: user});
            },
            changePassword: function (passData) {
                return $http.post(startUrl + '/change-password', passData);
            },
            deleteUser: function (userId) {
                return $http.post(startUrl + '/delete-user', {userId: userId});
            },
            lockUser: function (userId) {
                return $http.post(startUrl + '/lock-user', {userId: userId});
            },
            unlockUser: function (userId) {
                return $http.post(startUrl + '/unlock-user', {userId: userId});
            },
            getAllUsers: function (page) {
                return $http.get(startUrl + '/all-users', {params: page});
            },
            getUserById: function (userId) {
                return $http.get(startUrl + '/user-by-id', {params: {userId: userId}});
            },

            // Delivery Point
            addUserDeliveryPoint: function (userId, deliveryPoint) {
                return $http.post(startUrl + '/add-user-delivery-point', {userId: userId, deliveryPoint: deliveryPoint});
            },
            updateUserDeliveryPoint: function (userId, deliveryPoint) {
                return $http.post(startUrl + '/update-user-delivery-point', {userId: userId, deliveryPoint: deliveryPoint});
            },
            removeUserDeliveryPoint: function (userId, deliveryPointId) {
                return $http.post(startUrl + '/remove-user-delivery-point', {userId: userId, deliveryPointId: deliveryPointId});
            },
            removeAllUserDeliveryPoints: function (userId) {
                return $http.post(startUrl + '/remove-all-user-delivery-points', {userId: userId});
            },

            // current user delivery point
            addCurrentUserDeliveryPoint: function (deliveryPoint) {
                return $http.post(startUrl + '/add-current-user-delivery-point', {deliveryPoint: deliveryPoint});
            },
            updateCurrentUserDeliveryPoint: function (deliveryPoint) {
                return $http.post(startUrl + '/update-current-user-delivery-point', {deliveryPoint: deliveryPoint});
            },
            removeCurrentUserDeliveryPoint: function (deliveryPointId) {
                return $http.post(startUrl + '/remove-current-user-delivery-point', {deliveryPointId: deliveryPointId});
            }

        };
    }]);