import sys
import os
import xml.etree.ElementTree as ET
import xml.dom.minidom
import argparse

##
# Usage:
# python buildLibraryTests.py input_test_file.xml output_directory
#
#
##


def parse_and_rewrite_expression(expression, test_name):
    """ Parse and rewrite the expression for CQL use. """

    # Rewrite for CQL
    return f"define {test_name}:\n  {expression}\n"

def create_cql_library(path, library_version):
    """ Parse XML to create CQL library content. """
    ns = {'fpt': 'http://hl7.org/fhirpath/tests'}
    
    tree = ET.parse(path)
    root = tree.getroot()
    root_name = root.get("name")
    cql_defines = []

    for test in root.findall('.//fpt:test', ns):
        test_name = test.get('name')
        expression = test.find('fpt:expression', ns).text
        rewritten_expression = parse_and_rewrite_expression(expression, test_name)
        cql_defines.append(rewritten_expression)

    # CQL Library Header
    cql_content = f"library {root_name} version '{library_version}'\n\n"

    # Add all defines
    cql_content += "\n".join(cql_defines)

    return root_name, cql_content

def convert_xml(input_file, output_file, pretty_output_file):
    root_name, cql = create_cql_library(input_file, "1.0.0")
    
    # Parse the input XML
    tree = ET.parse(input_file)
    root = tree.getroot()

    # Create the root element for the output XML
    output_root = ET.Element('tests')

    # Create a single test node with the name attribute from the root's name attribute
    test_node = ET.Element('test', {'name': root.get('name')})

    # Add a libraryRef element as required
    library_node = ET.Element('library')
    library_node.text = cql
    test_node.append(library_node)

    # Iterate over all groups and tests in the input XML
    for group in root.findall('{http://hl7.org/fhirpath/tests}group'):
        for test in group.findall('{http://hl7.org/fhirpath/tests}test'):
            test_name = test.get('name')
            expression_element = test.find('{http://hl7.org/fhirpath/tests}expression')
            output_value = test.find('{http://hl7.org/fhirpath/tests}output')
            
            # Check if the expression has an invalid attribute
            if expression_element is not None and expression_element.get('invalid') == 'true':
                output_element = ET.Element('output', {'name': test_name, 'expectError': 'true'})
            else:
                output_element = ET.Element('output', {'name': test_name})
                if output_value is not None:
                    output_element.text = output_value.text
            
            test_node.append(output_element)

    # Append the single test node to the output root
    output_root.append(test_node)

    # Create a new XML tree with the output root and write it to a file
    #for a more compact file...
    #output_tree = ET.ElementTree(output_root)
    #output_tree.write(output_file, encoding='utf-8', xml_declaration=True)


    def prettify(elem):
        rough_string = ET.tostring(elem, 'utf-8')
        reparsed = xml.dom.minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")

    # Write pretty-printed XML to a file
    with open(pretty_output_file, 'w') as f:
        f.write(prettify(output_root))

        
def main():
    parser = argparse.ArgumentParser(description="Convert XML test files and generate CQL libraries.")
    parser.add_argument("input_file", help="Path to the input XML test file")
    parser.add_argument("output_dir", help="Path to the output directory")
    
    args = parser.parse_args()
    
    input_file = args.input_file
    output_dir = args.output_dir
    base_name = os.path.splitext(os.path.basename(input_file))[0]

    output_file = os.path.join(output_dir, f"{base_name}_compact.xml")
    pretty_output_file = os.path.join(output_dir, f"{base_name}_library.xml")
    
    convert_xml(input_file, output_file, pretty_output_file)
    


if __name__ == "__main__":
    main()