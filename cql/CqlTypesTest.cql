library CqlTypesTest

define "Any.AnyQuantity": 5.0 'g'

define "Any.AnyDateTime": DateTime(2012, 4, 4)

define "Any.AnyTime": @T09:00:00.000

define "Any.AnyInterval": Interval[2, 7]

define "Any.AnyList": {1, 2, 3}

define "Any.AnyTuple": Tuple { id: 5, name: 'Chris'}

define "Any.AnyString": Tuple { id: 5, name: 'Chris'}.name

define "DateTime.DateTimeNull": DateTime(null)

define "DateTime.DateTimeUpperBoundExcept": DateTime(10000, 12, 31, 23, 59, 59, 999)

define "DateTime.DateTimeLowerBoundExcept": DateTime(0000, 1, 1, 0, 0, 0, 0)

define "DateTime.DateTimeProper": DateTime(2016, 7, 7, 6, 25, 33, 910)

define "DateTime.DateTimeIncomplete": DateTime(2015, 2, 10)

define "DateTime.DateTimeUncertain": days between DateTime(2015, 2, 10) and DateTime(2015, 3)

define "DateTime.DateTimeMin": DateTime(0001, 1, 1, 0, 0, 0, 0)

define "DateTime.DateTimeMax": DateTime(9999, 12, 31, 23, 59, 59, 999)

define "DateTime.DateTimeTimeUnspecified": hour from @2015-02-10T is null

define "Quantity.QuantityTest": 150.2 '[lb_av]'

define "Quantity.QuantityTest2": 2.5589 '{eskimo kisses}'

define "Quantity.QuantityFractionalTooBig": 5.999999999 'g'

define "String.StringTestEscapeQuotes": '\'I start with a single quote and end with a double quote\"'

define "String.StringUnicodeTest": '\u0048\u0069'

define "Time.TimeProper": @T10:25:12.863

define "Time.TimeAllMax": @T23:59:59.999

define "Time.TimeAllMin": @T00:00:00.000

