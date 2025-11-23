from flask import request, jsonify


def code_conversion(app):
    @app.route("/kiwi/conversion/t2g", methods=['POST'])
    def text_to_graph():
        from .text_to_graph import text_to_graph
        data = request.get_json()
        return jsonify(text_to_graph(data))


    @app.route("/kiwi/conversion/g2t", methods=['POST'])
    def graph_to_text():
        from .graph_to_text import graph_to_text
        data = request.get_json()
        return jsonify(graph_to_text(data))

    #
    # Blockly display
    #
    @app.route("/kiwi/conversion/t2b", methods=['POST'])
    def text_to_block():
        from .blockly.text_to_block import text_to_block
        data = request.get_json()
        return jsonify(text_to_block(data))

    @app.route("/kiwi/conversion/b2t", methods=['POST'])
    def block_to_text():
        from .blockly.block_to_text import block_to_text
        data = request.get_json()
        return jsonify(block_to_text(data))

    @app.route("/kiwi/blockly/toolbox")
    def blockly_tools():
        from .blockly.blocks import TOOLBOX
        return jsonify(TOOLBOX)

    @app.route("/kiwi/blockly/definitions")
    def blockly_def():
        from .blockly.blocks import DEFINITIONS
        return jsonify(DEFINITIONS)
