const {PassThrough} = require('readable-stream');
const asyncParseXML = require('./Saxophone');

/**
 * Information about a text node.
 *
 * @typedef TextNode
 * @type {object}
 * @prop {string} contents The text value.
 */

/**
 * Emitted whenever a text node is encountered.
 *
 * @event SaxophoneEmulator#text
 * @type {TextNode}
 */

/**
 * Information about a CDATA node
 * (<![CDATA[ ... ]]>).
 *
 * @typedef CDATANode
 * @type {object}
 * @prop {string} contents The CDATA contents.
 */

/**
 * Emitted whenever a CDATA node is encountered.
 *
 * @event SaxophoneEmulator#cdata
 * @type {CDATANode}
 */

/**
 * Information about a comment node
 * (<!-- ... -->).
 *
 * @typedef CommentNode
 * @type {object}
 * @prop {string} contents The comment contents
 */

/**
 * Emitted whenever a comment node is encountered.
 *
 * @event SaxophoneEmulator#comment
 * @type {CommentNode}
 */

/**
 * Information about a processing instruction node
 * (<? ... ?>).
 *
 * @typedef ProcessingInstructionNode
 * @type {object}
 * @prop {string} contents The instruction contents
 */

/**
 * Emitted whenever a processing instruction node is encountered.
 *
 * @event SaxophoneEmulator#processinginstruction
 * @type {ProcessingInstructionNode}
 */

/**
 * Information about an opened tag
 * (<tag attr="value">).
 *
 * @typedef TagOpenNode
 * @type {object}
 * @prop {string} name Name of the tag that was opened.
 * @prop {string} attrs Attributes passed to the tag, in a string representation
 * (use Saxophone.parseAttributes to get an attribute-value mapping).
 * @prop {bool} isSelfClosing Whether the tag self-closes (tags of the form
 * `<tag />`). Such tags will not be followed by a closing tag.
 */

/**
 * Emitted whenever an opening tag node is encountered.
 *
 * @event SaxophoneEmulator#tagopen
 * @type {TagOpen}
 */

/**
 * Information about a closed tag
 * (</tag>).
 *
 * @typedef TagCloseNode
 * @type {object}
 * @prop {string} name The tag name
 */

/**
 * Emitted whenever a closing tag node is encountered.
 *
 * @event SaxophoneEmulator#tagclose
 * @type {TagCloseNode}
 */

/**
 * Parse a XML stream and emit events corresponding
 * to the different tokens encountered. This should
 * emulate Saxophone.
 *
 * @extends stream.PassThrough
 *
 * @emits SaxophoneEmulator#text
 * @emits SaxophoneEmulator#cdata
 * @emits SaxophoneEmulator#comment
 * @emits SaxophoneEmulator#processinginstruction
 * @emits SaxophoneEmulator#tagopen
 * @emits SaxophoneEmulator#tagclose
 */
class SaxophoneEmulator extends PassThrough {
    /**
     * Pass the incoming stream through to the
     * asynchronous XML parser and emit events like
     * Saxophone would
     */
    constructor() {
        super({decodeStrings: false});

        // start parsing the output of this transform,
        // emitting the events that Saxophone would.
        this.emitXMLevents(
            asyncParseXML(this)
        ).catch(this.destroy);
    }

    async emitXMLevents(nodeIterator) {
        for await (let node of nodeIterator) {
            switch (node[0]) {
            case 'tagopen':
                this.emit(node[0], {name:node[1], attrs:node[2], isSelfClosing:node[3]});
                break;
            case 'text':
                this.emit(node[0], {contents:node[1]});
                break;
            case 'tagclose':
                this.emit(node[0], {name: node[1]});
                break;
            case 'processinginstruction':
            case 'cdata':
            case 'comment':
                this.emit(node[0], {contents: node[1]});
                break;
            }
        }
    }

    /**
     * Immediately parse a complete chunk of XML and close the stream.
     *
     * @param {Buffer|string} input Input chunk.
     * @return {Saxophone} This instance.
     */
    parse(input) {
        this.end(input);
        return this;
    }
}

module.exports = SaxophoneEmulator;
