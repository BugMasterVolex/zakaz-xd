/**
 *  Создан, Активен, Подтвержден, Отгружен, Закрыт.
 */
function OrderStatus(code, title) {
	this.code = code; // str
	this.title = title; // str
}

exports.OrderStatus = OrderStatus;
