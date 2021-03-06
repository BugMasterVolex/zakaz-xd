angular
    .module('zakaz-xd.demo', [
        'zakaz-xd.directives.decimal',
        'zakaz-xd.directives.my-dropdown',
        'zakaz-xd.directives.my.ui.mask',
        'ui.select',
        'ngSanitize',
        'ui.bootstrap',
        'nvd3'
    ])
    .factory("dateParserHelpers", [function () {
        var cache = {};
        return {
            getInteger: function (string, startPoint, minLength, maxLength) {
                var val = string.substring(startPoint);
                var matcher = cache[minLength + "_" + maxLength];
                if (!matcher) {
                    matcher = new RegExp("^(\\d{" + minLength + "," + maxLength + "})");
                    cache[minLength + "_" + maxLength] = matcher;
                }
                var match = matcher.exec(val);
                if (match) {
                    return match[1];
                }
                return null;
            }
        };
    }])
    .factory("$dateParser", ["$locale", "dateParserHelpers", function ($locale, dateParserHelpers) {
        var datetimeFormats = $locale.DATETIME_FORMATS;
        var monthNames = datetimeFormats.MONTH.concat(datetimeFormats.SHORTMONTH);
        var dayNames = datetimeFormats.DAY.concat(datetimeFormats.SHORTDAY);
        return function (val, format) {
            if (angular.isDate(val)) {
                return val;
            }
            try {
                val = val + "";
                format = format + "";
                if (!format.length) {
                    return new Date(val);
                }
                if (datetimeFormats[format]) {
                    format = datetimeFormats[format];
                }
                var now = new Date(), i_val = 0, i_format = 0, format_token = "", year = now.getFullYear(), month = now.getMonth() + 1, /*date = now.getDate()*/ date = 1, hh = 0, mm = 0, ss = 0, sss = 0, ampm = "am", z = 0, parsedZ = false;
                while (i_format < format.length) {
                    format_token = format.charAt(i_format);
                    var token = "";
                    if (format.charAt(i_format) == "'") {
                        var _i_format = i_format;
                        while (format.charAt(++i_format) != "'" && i_format < format.length) {
                            token += format.charAt(i_format);
                        }
                        if (val.substring(i_val, i_val + token.length) != token) {
                            throw "Pattern value mismatch";
                        }
                        i_val += token.length;
                        i_format++;
                        continue;
                    }
                    while (format.charAt(i_format) == format_token && i_format < format.length) {
                        token += format.charAt(i_format++);
                    }
                    if (token == "yyyy" || token == "yy" || token == "y") {
                        var minLength, maxLength;
                        if (token == "yyyy") {
                            minLength = 4;
                            maxLength = 4;
                        }
                        if (token == "yy") {
                            minLength = 2;
                            maxLength = 2;
                        }
                        if (token == "y") {
                            minLength = 2;
                            maxLength = 4;
                        }
                        year = dateParserHelpers.getInteger(val, i_val, minLength, maxLength);
                        if (year === null) {
                            throw "Invalid year";
                        }
                        i_val += year.length;
                        if (year.length == 2) {
                            if (year > 70) {
                                year = 1900 + (year - 0);
                            } else {
                                year = 2e3 + (year - 0);
                            }
                        }
                    } else if (token === "MMMM" || token == "MMM") {
                        month = 0;
                        for (var i = 0; i < monthNames.length; i++) {
                            var month_name = monthNames[i];
                            if (val.substring(i_val, i_val + month_name.length).toLowerCase() == month_name.toLowerCase()) {
                                month = i + 1;
                                if (month > 12) {
                                    month -= 12;
                                }
                                i_val += month_name.length;
                                break;
                            }
                        }
                        if (month < 1 || month > 12) {
                            throw "Invalid month";
                        }
                    } else if (token == "EEEE" || token == "EEE") {
                        for (var j = 0; j < dayNames.length; j++) {
                            var day_name = dayNames[j];
                            if (val.substring(i_val, i_val + day_name.length).toLowerCase() == day_name.toLowerCase()) {
                                i_val += day_name.length;
                                break;
                            }
                        }
                    } else if (token == "MM" || token == "M") {
                        month = dateParserHelpers.getInteger(val, i_val, token.length, 2);
                        if (month === null || month < 1 || month > 12) {
                            throw "Invalid month";
                        }
                        i_val += month.length;
                    } else if (token == "dd" || token == "d") {
                        date = dateParserHelpers.getInteger(val, i_val, token.length, 2);
                        if (date === null || date < 1 || date > 31) {
                            throw "Invalid date";
                        }
                        i_val += date.length;
                    } else if (token == "HH" || token == "H") {
                        hh = dateParserHelpers.getInteger(val, i_val, token.length, 2);
                        if (hh === null || hh < 0 || hh > 23) {
                            throw "Invalid hours";
                        }
                        i_val += hh.length;
                    } else if (token == "hh" || token == "h") {
                        hh = dateParserHelpers.getInteger(val, i_val, token.length, 2);
                        if (hh === null || hh < 0 || hh > 12) {
                            throw "Invalid hours";
                        }
                        i_val += hh.length;
                    } else if (token == "mm" || token == "m") {
                        mm = dateParserHelpers.getInteger(val, i_val, token.length, 2);
                        if (mm === null || mm < 0 || mm > 59) {
                            throw "Invalid minutes";
                        }
                        i_val += mm.length;
                    } else if (token == "ss" || token == "s") {
                        ss = dateParserHelpers.getInteger(val, i_val, token.length, 2);
                        if (ss === null || ss < 0 || ss > 59) {
                            throw "Invalid seconds";
                        }
                        i_val += ss.length;
                    } else if (token === "sss") {
                        sss = dateParserHelpers.getInteger(val, i_val, 3, 3);
                        if (sss === null || sss < 0 || sss > 999) {
                            throw "Invalid milliseconds";
                        }
                        i_val += 3;
                    } else if (token == "a") {
                        if (val.substring(i_val, i_val + 2).toLowerCase() == "am") {
                            ampm = "AM";
                        } else if (val.substring(i_val, i_val + 2).toLowerCase() == "pm") {
                            ampm = "PM";
                        } else {
                            throw "Invalid AM/PM";
                        }
                        i_val += 2;
                    } else if (token == "Z") {
                        parsedZ = true;
                        if (val[i_val] === "Z") {
                            z = 0;
                            i_val += 1;
                        } else {
                            var txStr;
                            if (val[i_val + 3] === ":") {
                                tzStr = val.substring(i_val, i_val + 6);
                                z = parseInt(tzStr.substr(0, 3), 10) * 60 + parseInt(tzStr.substr(4, 2), 10);
                                i_val += 6;
                            } else {
                                tzStr = val.substring(i_val, i_val + 5);
                                z = parseInt(tzStr.substr(0, 3), 10) * 60 + parseInt(tzStr.substr(3, 2), 10);
                                i_val += 5;
                            }
                        }
                        if (z > 720 || z < -720) {
                            throw "Invalid timezone";
                        }
                    } else {
                        if (val.substring(i_val, i_val + token.length) != token) {
                            throw "Pattern value mismatch";
                        } else {
                            i_val += token.length;
                        }
                    }
                }
                if (i_val != val.length) {
                    throw "Pattern value mismatch";
                }
                year = parseInt(year, 10);
                month = parseInt(month, 10);
                date = parseInt(date, 10);
                hh = parseInt(hh, 10);
                mm = parseInt(mm, 10);
                ss = parseInt(ss, 10);
                sss = parseInt(sss, 10);
                if (month == 2) {
                    if (year % 4 === 0 && year % 100 !== 0 || year % 400 === 0) {
                        if (date > 29) {
                            throw "Invalid date 29";
                        }
                    } else {
                        if (date > 28) {
                            throw "Invalid date 28";
                        }
                    }
                }
                if (month == 4 || month == 6 || month == 9 || month == 11) {
                    if (date > 30) {
                        throw "Invalid date";
                    }
                }
                if (hh < 12 && ampm == "PM") {
                    hh += 12;
                } else if (hh > 11 && ampm == "AM") {
                    hh -= 12;
                }
                var localDate = new Date(year, month - 1, date, hh, mm, ss, sss);
                if (parsedZ) {
                    return new Date(localDate.getTime() - (z + localDate.getTimezoneOffset()) * 6e4);
                }
                return localDate;
            } catch (e) {
                return undefined;
            }
        };
    }])
    .filter('month', function () {
        return function (value) {
            var monthes = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
            var num = parseInt(value, 10);

            return monthes[num - 1];
        };
    })
    .controller('DemoCtrl', ['$scope', '$stateParams', '$state', '$modal', "$filter", "$dateParser",
        function ($scope, $stateParams, $state, $modal, $filter, $dateParser) {

            $scope.mask = '99.99.9999';
            $scope.placeholder = 'ДД.ММ.ГГГГ';

            $scope.models = {
                lowercase: 'my test str',
                lowercase1: '',
                russianOnlyVal: 'test04'
            };

            $scope.toggled = function(open) {
                //console.log('Dropdown is now: ', open);
            };

            $scope.openModal = function () {
                var modalInstance = $modal.open({
                    animation: true,
                    backdrop: 'static',
                    size: 'lg',
                    templateUrl: 'app/main-pages/demo/test-dialog.tpl.html',
                    resolve: {},
                    controller: function ($scope, $modalInstance) {
                        $scope.close = function () {
                            $modalInstance.close();
                        };
                    }
                });
            };


            $scope.models.banEnterZeroVal = 0;

            ////////////////////////////////////////////////////////////////////

            var PERIOD_FORMAT = 'MM.yyyy',
                TITLE_CHARGED = 'Начислено',
                TITLE_PAID = 'Оплачено',
                LABEL_DIMENSIONS = ', руб.',
                colorArray = ['#60B044', '#BA1F0A'];

            var xAxisKeys = {
                charged: TITLE_CHARGED + LABEL_DIMENSIONS,
                paid: TITLE_PAID + LABEL_DIMENSIONS
            };

            var xAxisLabels = {};
            xAxisLabels[xAxisKeys.charged] = TITLE_CHARGED;
            xAxisLabels[xAxisKeys.paid] = TITLE_PAID;

            $scope.getZeroIfNull = function (number) {
                return number != null ? number : 0;
            };

            $scope.chartData = [
                {key: xAxisKeys.paid, values: []},
                {key: xAxisKeys.charged, values: []}
            ];

            $scope.updateChart = function (items) {
                angular.forEach($scope.chartData, function (item) {
                    item.values = [];
                });

                angular.forEach(items, function (item) {
                    var month = item.periodMonth,
                        paid = $scope.getZeroIfNull(item.paid),
                        charged = $scope.getZeroIfNull(item.charged);

                    if (month.toString().length < 2) {
                        month = '0' + month;
                    }

                    var date = $dateParser(month + '.' + item.periodYear, PERIOD_FORMAT);
                    angular.forEach($scope.chartData, function (chartData) {
                        switch (chartData.key) {
                            case xAxisKeys.charged:
                                chartData.values.push([date, Math.max(charged - paid, 0), charged]);
                                break;
                            case xAxisKeys.paid:
                                chartData.values.push([date, paid, paid]);
                                break;
                            default:
                                break;
                        }
                    });
                });
            };

            $scope.chartDataItems = [
                {"periodYear": 2015, "periodMonth": 9, "charged": 418.25, "paid": 10.45},
                {"periodYear": 2015, "periodMonth": 10, "charged": 0, "paid": 0},
                {"periodYear": 2015, "periodMonth": 11, "charged": 250, "paid": 50},
                {"periodYear": 2015, "periodMonth": 12, "charged": 0, "paid": 0},
                {"periodYear": 2016, "periodMonth": 1, "charged": 0, "paid": 0},
                {"periodYear": 2016, "periodMonth": 2, "charged": 0, "paid": 0}
            ];

            function transformItemsToMultiBarChart(paymentItems) {
                var chartData = [
                    {key: xAxisKeys.paid, values: [], type: 'bar', yAxis: 1},
                    {key: xAxisKeys.charged, values: [], type: 'bar', yAxis: 2}
                ];
                if (!paymentItems) {
                    return chartData;
                }

                for (var i=0; i<paymentItems.length; ++i) {
                    var payment = paymentItems[i];

                    var month = payment.periodMonth,
                        paid = $scope.getZeroIfNull(payment.paid),
                        charged = $scope.getZeroIfNull(payment.charged);

                    if (month.toString().length < 2) {
                        month = '0' + month;
                    }

                    var date = $dateParser(month + '.' + payment.periodYear, PERIOD_FORMAT);
                    //var date = month + '.' + payment.periodYear;
                    //console.log("date: ", date);

                    // оплачено
                    //chartData[0].values.push({x: date, y: paid, realValue: paid});
                    // начислено
                    //chartData[1].values.push({x: date, y: Math.max(charged - paid, 0), realValue: charged});
                    
                    chartData[0].values.push({x: date.getTime(), y: paid});
                    chartData[1].values.push({x: date.getTime(), y: Math.max(charged - paid, 0)});

                }
                return chartData;
            }

            var chartDomElements = {};

            function onRenderEnd(e) {
                if (!chartDomElements.layer) {
                    return;
                }
                // recalculateChargedBar
                var w = nv.utils.availableWidth(null, $scope.chartScope.svg, {left: 117, right: 0});
                //console.log('$scope.chartScope', w);
                //console.log('this', this);
                //var y = d3.scale.linear()
                //    .domain([0, 500])
                //    .range([300, 0]);
                //chartDomElements.rect
                    //.duration(500)
                    //.delay(function(d, i) { return i * 10; })

                    //.attr("y", function(d) {
                    //    if (d.y!==null && d.y0 !== undefined) {
                    //        return y(d.y);//y(d.y0 + d.y);
                    //    } else {
                    //        return this.getAttribute("y");
                    //    }
                    //
                    //})
                    //.attr("height", function(d) {
                    //    if (d.y!==null && d.y0 !== undefined) {
                    //        return y(0) - y(d.y);
                    //    } else {
                    //        return this.getAttribute("height");
                    //    }
                    //
                    //}).transition();

                    //.attr("x", function(d) { return x(d.x); })
                    //.attr("width", x.rangeBand());

                //chartDomElements.svg.selectAll(".nv-x.nv-axis .tick text").each(function(t){console.log("text", t);})
                chartDomElements.svg.selectAll(".nv-x.nv-axis .tick text").each(
                    function(el, i) {
                        var text = d3.select(this);
                        var words = text.text().split(/\s+/).reverse();
                        //console.log("text: ", text);
                        //console.log("words: ", words);

                        var word,
                        //line = [],
                            lineNumber = 0,
                            lineHeight = 1.1, // ems
                            y = text.attr("y"),
                            dy = parseFloat(text.attr("dy")),
                            tspan = text.text(null);//.append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
                        while (word = words.pop()) {
                            //line.push(word);
                            //tspan.text(line.join(" "));
                            //if (tspan.node().getComputedTextLength() > 40) {
                            //line.pop();
                            //tspan.text(line.join(" "));
                            //line = [word];
                            tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", lineNumber * lineHeight + dy + "em").text(word);
                            ++lineNumber;
                            //}
                        }

                        //.filter(function(d,i) {
                        //    return ;
                        //})

                        // скрыть tick подписи по x которые не убираются по ширине
                        if (i % Math.ceil($scope.chartData[0].values.length / (w / 100)) !== 0) {
                            text.style('opacity', 0);
                        }


                    }
                );

            //.filter(function(d,i) {
            //        return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
            //    })
            //        .selectAll('text, line')
            //        .style('opacity', 0);
            }

            $scope.chartApi = {};

            $scope.chartScope = {};



            $scope.onChartReady = function(scope, element) {
                //var layer = svg.selectAll(".layer");
                var api = scope.api;
                var chart = scope.chart;
                var svg = scope.svg;

                $scope.chartScope = scope;

                var layer = svg.selectAll(".nv-group");
                var rect = layer.selectAll("rect");

                chartDomElements.layer = layer;
                chartDomElements.rect = rect;
                chartDomElements.svg = svg;


                onRenderEnd();

                //var oldUpdateFn = scope.api.update;
                //scope.api.update = function() {
                //    oldUpdateFn.apply(this, arguments);
                //    console.log("new update fn: " , this);
                //};
                //
                //var oldUpdateWithDataFn = scope.api.updateWithData;
                //scope.api.updateWithData = function() {
                //    oldUpdateWithDataFn.apply(this, arguments);
                //    console.log("new oldUpdateWithDataFn fn: " , this);
                //};
            };

            $scope.chartOptions = {
                chart: {
                    //type: 'multiBarChart',
                    type: 'multiChart',
                    height: 450,
                    margin : {
                        top: 30,
                        right: 60,
                        bottom: 50,
                        left: 70
                    },
                    //stacked: true,
                    //height: 300,
                    //margin: {
                        //left: 117,
                        //right: 0
                    //},
                    //x: function (d) {
                    //    return $filter('month')(d[0].getMonth() + 1) + ' ' + d[0].getFullYear() + 'г.';
                    //},
                    //y: function (d) {
                    //    return d3.format('.02f')(d[1]);
                    //},
                    noData: "Данные за выбранный период отсутствуют!",
                    color: function (d, i) {
                        return colorArray[i];
                    },
                    //reduceXTicks: false,
                    //rotateLabels: 0,      //Angle to rotate x-axis labels.
                    //showControls: true,   //Allow user to switch between 'Grouped' and 'Stacked' mode.
                    //groupSpacing: 0.1,
                    //legendColor: function (d, i) {
                    //    return colorArray[i];
                    //},
                    //reduceXTicks: true,
                    //objectEquality: true,
                    //stacked: true,

                    //valueFormat: function(d){
                    //    return d3.format(',.4f')(d);
                    //},
                    duration: 0,
                    dispatch: {
                        beforeUpdate: function(e){
                            console.log('! before UPDATE !');
                        },
                        renderEnd: onRenderEnd
                        //renderEnd: function(e) {
                        //    console.log('renderEnd: ', e);
                        //}
                    },
                    //xAxis: {
                        //tickFormat: function(d){
                            //console.log("xAxis format", d);
                            //return d3.format(',f')(d);
                        //}
                    //},
                    xAxis: {
                        tickSize: 0,
                        tickPadding: 0,
                        tickFormat: function (d) {
                            console.log("xAxis format", d);
                            var date = new Date(d);
                            return $filter('month')(date.getMonth() + 1) + ' ' + date.getFullYear() + 'г.';
                        }

                    },
                    forceY: [0, 500],
                    bar1: {
                        forceY: [0, 500]
                    },
                    bar2: {
                        forceY: [0, 500]
                    },
                    yAxis1: {
                        tickFormat: function (d) {
                            return d;
                            //return d3.format('.02f')(d);
                        },
                        range: [0, 500],
                        domain: [0, 500]
                    },
                    yAxis2: {
                        tickFormat: function (d) {
                            return d;//d3.format('.02f')(d);
                        },
                        range: [0, 500],
                        domain: [0, 500]
                    },
                    //tooltips: true,
                    //tooltipcontent: function (key, x, y, e) {
                        //var label = xAxisLabels[key],
                            //amount = $filter('currency')(e.series.values[e.pointIndex][2]);
                        //return '<h3>' + label + '</h3>' + '<p>' + amount + ' за ' + x + '</p>';
                    //}


                    //tooltips: true,
                    //
                    //
                    //
                    //type: 'discreteBarChart',
                    //height: 300,
                    //
                    showXAxis: true,
                    showYAxis: true,
                    showLegend: true,
                    tooltips: true,
                    tooltipcontent: function (key, x, y, e) {
                        var label = xAxisLabels[key],
                            amount = $filter('currency')(e.series.values[e.pointIndex][2]);
                        return '<h3>' + label + '</h3>' + '<p>' + amount + ' за ' + x + '</p>';
                    },
                    //xAxisTickFormat: function (d) {return $filter('month')(d.getMonth() + 1) + ' ' + d.getFullYear() + 'г.';},
                    //yAxisTickFormat: function (d) {return d3.format('.02f')(d);},
                    //
                    delay: "0",
                    //noData: "Данные за выбранный период отсутствуют!",
                    //color: function (d, i) {return colorArray[i];},
                    //legendColor: function (d, i) {return colorArray[i];},
                    //reduceXTicks: true,
                    //objectEquality: true,
                    //stacked: true,
                    //margin : {
                    //    left: 117
                    //}
                },
                callback: function(e) {
                    console.log('! callback !');
                }
            };

            /* Inspired by Lee Byron's test data generator. */
            //function stream_layers(n, m, o) {
            //    if (arguments.length < 3) {
            //        o = 0;
            //    }
            //    function bump(a) {
            //        var x = 1 / (0.1 + Math.random()),
            //            y = 2 * Math.random() - 0.5,
            //            z = 10 / (0.1 + Math.random());
            //        for (var i = 0; i < m; i++) {
            //            var w = (i / m - y) * z;
            //            a[i] += x * Math.exp(-w * w);
            //        }
            //    }
            //    var series = d3.range(n).map(function() {
            //        var a = [], i;
            //        for (i = 0; i < m; i++) {
            //            a[i] = o + o * Math.random();
            //        }
            //        for (i = 0; i < 5; i++) {
            //            bump(a);
            //        }
            //        return a.map(stream_index);
            //    });
            //    console.log("series: ", series);
            //    return series;
            //}

            /* Another layer generator using gamma distributions. */
            //function stream_waves(n, m) {
            //    return d3.range(n).map(function(i) {
            //        return d3.range(m).map(function(j) {
            //            var x = 20 * j / m - i / 3;
            //            return 2 * x * Math.exp(-0.5 * x);
            //        }).map(stream_index);
            //    });
            //}

            function stream_index(d, i) {
                return {x: i, y: Math.max(0, d)};
            }



            //Generate some nice data.
            //function exampleData() {
            //    return stream_layers(3, 10+Math.random()*100, 0.1).map(function(data, i) {
            //        return {
            //            key: 'Stream #' + i,
            //            values: data
            //        };
            //    });
            //}

            //stream_layers(3, 10+Math.random()*100, 0.1);

            //$scope.chartDataItems = exampleData();

            //var items = exampleData();
            //console.log("chartData", items);

            $scope.chartData = transformItemsToMultiBarChart($scope.chartDataItems);
            //console.log("chartData", $scope.chartData);

            //$scope.updateChart($scope.chartDataItems);

            // Inspired by Lee Byron's test data generator.
            //function bumpLayer(n, o) {
            //
            //    function bump(a) {
            //        var x = 1 / (0.1 + Math.random()),
            //            y = 2 * Math.random() - 0.5,
            //            z = 10 / (0.1 + Math.random());
            //        for (var i = 0; i < n; i++) {
            //            var w = (i / n - y) * z;
            //            a[i] += x * Math.exp(-w * w);
            //        }
            //    }
            //
            //    var a = [], i;
            //    for (i = 0; i < n; ++i) {
            //        a[i] = o + o * Math.random();
            //    }
            //    for (i = 0; i < 5; ++i) {
            //        bump(a);
            //    }
            //    return a.map(function(d, i) { return {x: i, y: Math.max(0, d)}; });
            //}
            //
            //var n = 4, // number of layers
            //    m = 58, // number of samples per layer
            //    stack = d3.layout.stack(),
            //    layers = stack(d3.range(n).map(function() { return bumpLayer(m, 0.1); })),
            //    yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
            //    yStackMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });
            //
            //
            //console.log("layers", layers);
            //console.log("yGroupMax", yGroupMax);
            //console.log("yStackMax", yStackMax);
        }
    ])
;
