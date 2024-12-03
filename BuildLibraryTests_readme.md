The buildLibraryTests.py is a python script that generates library test xml versions of the CQF Unit Tests for expressions.

To use:

```bash
python buildLibraryTests.py /path/to/input_test_file.xml /path/to/output_directory

```

The script will generate the versions of the test files with ``_library.xml`` appended to the end.

To copy all of the CQFramework unit tests (replace the pertinent path components):

```bash
python buildLibraryTests.py /path/to/tests/cql/CqlAggregateFunctionsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlAggregateTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlArithmeticFunctionsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlComparisonOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlConditionalOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlDateTimeOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlErrorsAndMessagingOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlIntervalOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlListOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlLogicalOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlNullologicalOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlOverloadMatching.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlQueryTests.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlStringOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlTypeOperatorsTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/CqlTypesTest.xml /path/to/output_directory
python buildLibraryTests.py /path/to/tests/cql/ValueLiteralsAndSelectors.xml /path/to/output_directory

```