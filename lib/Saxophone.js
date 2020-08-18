/**
 * Information about a text node.
 *
 * @typedef TextNode
 * @type {array}
 * @prop {string} 0 - 'text'
 * @prop {string} 1 - The text value.
 */

/**
 * Emitted whenever a text node is encountered.
 *
 * @event xmlNodeGenerator#text
 * @type {TextNode}
 */

/**
 * Information about a CDATA node
 * (<![CDATA[ ... ]]>).
 *
 * @typedef CDATANode
 * @type {array}
 * @prop {string} 0 - 'cdata'
 * @prop {string} 1 -  The CDATA contents.
 */

/**
 * Emitted whenever a CDATA node is encountered.
 *
 * @event xmlNodeGenerator#cdata
 * @type {CDATANode}
 */

/**
 * Information about a comment node
 * (<!-- ... -->).
 *
 * @typedef CommentNode
 * @type {array}
 * @prop {string} 0 - 'comment'
 * @prop {string} 1 -  The comment contents
 */

/**
 * Emitted whenever a comment node is encountered.
 *
 * @event xmlNodeGenerator#comment
 * @type {CommentNode}
 */

/**
 * Information about a processing instruction node
 * (<? ... ?>).
 *
 * @typedef ProcessingInstructionNode
 * @type {array}
 * @prop {string} 0 - 'processinginstruction'
 * @prop {string} 1 -  The instruction contents
 */

/**
 * Emitted whenever a processing instruction node is encountered.
 *
 * @event xmlNodeGenerator#processinginstruction
 * @type {ProcessingInstructionNode}
 */

/**
 * Information about an opened tag
 * (<tag attr="value">).
 *
 * @typedef TagOpenNode
 * @type {array}
 * @prop {string} 0 - 'tagopen'
 * @prop {string} 1 -  Name of the tag that was opened.
 * @prop {string} 2 - Attributes passed to the tag, in a string representation (unparsed)
 * (use Saxophone.parseAttributes to get an attribute-value mapping).
 * @prop {string} 3 - '' if the tag does not self close or "/" if the tag self-closes
 * (tags of the form `<tag />`). Such tags will not be followed by a closing tag.
 */

/**
 * Emitted whenever an opening tag node is encountered.
 *
 * @event xmlNodeGenerator#tagopen
 * @type {TagOpen}
 */

/**
 * Information about a closed tag
 * (</tag>).
 *
 * @typedef TagCloseNode
 * @type {array}
 * @prop {string} 0 - 'tagclose'
 * @prop {string} 1 -  The tag name
 */

/**
 * Emitted whenever a closing tag node is encountered.
 *
 * @event xmlNodeGenerator#tagclose
 * @type {TagCloseNode}
 */

/**
 * Nodes that can be found inside an XML stream.
 * @private
 */
const Node = {
    text: 'text',
    cdata: 'cdata',
    comment: 'comment',
    markupDeclaration: 'markupDeclaration',
    processingInstruction: 'processinginstruction',
    tagOpen: 'tagopen',
    tagClose: 'tagclose',
};

/**
 * Asynchronously parse an iterator containing XML and yield tuples
 * corresponding to the different tokens encountered.
 *
 * @generator
 * @yields xmlNodeGenerator#text
 * @yields xmlNodeGenerator#cdata
 * @yields xmlNodeGenerator#comment
 * @yields xmlNodeGenerator#processinginstruction
 * @yields xmlNodeGenerator#tagopen
 * @yields xmlNodeGenerator#tagclose
 */
async function* xmlNodeGenerator(options, sourceIterator) {
    if (arguments.length == 1) {
        sourceIterator = options;
        options = {};
    }
    // eslint-disable-next-line no-debugger
    debugger;
    let optinclude = options.include || Object.values(Node);
    if (!Array.isArray(optinclude))
        optinclude = [optinclude];
    optinclude = new Set(optinclude);
    const optCloseTagOnSelfClose = options.closeTagOnSelfClose;
    const optNoEmptyText = options.noEmptyText;

    /**
     * Handle the opening of a tag in the text stream.
     *
     * Push the tag into the opened tag stack and return the
     * corresponding event.
     *
     * @param {TagOpen} node Information about the opened tag.
     */

    const tagStack = [];

    function handleTagOpening(node) {
        if (!node.isSelfClosing) {
            tagStack.push(node.name);
        }
        if (optinclude.has(Node.tagOpen)) {
            return [Node.tagOpen, node.name, node.attrs.trim(), node.isSelfClosing ? '/' : ''];
        }
    }

    // Not waiting initially
    let waiting = null;

    /**
     * Put the stream into waiting mode, which means we need more data
     * to finish parsing the current token.
     *
     * @private
     * @param token Type of token that is being parsed.
     * @param data Pending data.
     */
    function wait(token, data) {
        waiting = {token, data};
    }

    /**
     * Put the stream out of waiting mode.
     *
     * @private
     * @return Any data that was pending.
     */
    function unwait() {
        if (waiting === null) {
            return '';
        }

        const data = waiting.data;
        waiting = null;
        return data;
    }

    if (typeof sourceIterator === 'string' || sourceIterator instanceof String) {
        // Iterate an array with a single string argument rather than iterating the string.
        // A string would be iterated one character (code point) at a time,
        // which probably was not intended.
        sourceIterator = [sourceIterator];
    }
    for await (let input of sourceIterator) {
        // Use pending data if applicable and get out of waiting mode
        input = unwait() + input;

        let chunkPos = 0;
        const end = input.length;

        while (chunkPos < end) {
            if (input[chunkPos] !== '<') {
                const nextTag = input.indexOf('<', chunkPos);

                // We read a TEXT node but there might be some
                // more text data left, so we wait
                if (nextTag === -1) {
                    wait(
                        Node.text,
                        input.slice(chunkPos)
                    );
                    break;
                }

                // A tag follows, so we can be confident that
                // we have all the data needed for the TEXT node
                if (optinclude.has(Node.text)) {
                    const text = input.slice(chunkPos, nextTag);
                    if (!optNoEmptyText || /^\s*$/.test(text)) {
                        yield [
                            Node.text,
                            text
                        ];
                    }
                }

                chunkPos = nextTag;
            }

            // Invariant: the cursor now points on the name of a tag,
            // after an opening angled bracket
            chunkPos += 1;
            const nextChar = input[chunkPos];

            // Begin a DOCTYPE, CDATA or comment section
            if (nextChar === '!') {
                chunkPos += 1;
                const nextNextChar = input[chunkPos];

                // Unclosed markup declaration section of unknown type,
                // we need to wait for upcoming data
                if (nextNextChar === undefined) {
                    wait(
                        Node.markupDeclaration,
                        input.slice(chunkPos - 2)
                    );
                    break;
                }

                if (
                    nextNextChar === '[' &&
                    'CDATA['.indexOf(input.slice(
                        chunkPos + 1,
                        chunkPos + 7
                    )) > -1
                ) {
                    chunkPos += 7;
                    const cdataClose = input.indexOf(']]>', chunkPos);

                    // Incomplete CDATA section, we need to wait for
                    // upcoming data
                    if (cdataClose === -1) {
                        wait(
                            Node.cdata,
                            input.slice(chunkPos - 9)
                        );
                        break;
                    }

                    if (optinclude.has(Node.cdata)) {
                        yield [
                            Node.cdata,
                            input.slice(chunkPos, cdataClose)
                        ];
                    }

                    chunkPos = cdataClose + 3;
                    continue;
                }

                if (
                    nextNextChar === '-' && (
                        input[chunkPos + 1] === undefined ||
                        input[chunkPos + 1] === '-'
                    )
                ) {
                    chunkPos += 2;
                    const commentClose = input.indexOf('--', chunkPos);

                    // Incomplete comment node, we need to wait for
                    // upcoming data
                    if (commentClose === -1) {
                        wait(
                            Node.comment,
                            input.slice(chunkPos - 4)
                        );
                        break;
                    }

                    if (input[commentClose + 2] !== '>') {
                        throw new Error('Unexpected -- inside comment');
                    }

                    if (optinclude.has(Node.comment)) {
                        yield [
                            Node.comment,
                            input.slice(chunkPos, commentClose)
                        ];
                    }

                    chunkPos = commentClose + 3;
                    continue;
                }

                // TODO: recognize DOCTYPEs here
                throw new Error('Unrecognized sequence: <!' + nextNextChar);
            }

            if (nextChar === '?') {
                chunkPos += 1;
                const piClose = input.indexOf('?>', chunkPos);

                // Unclosed processing instruction, we need to
                // wait for upcoming data
                if (piClose === -1) {
                    wait(
                        Node.processingInstruction,
                        input.slice(chunkPos - 2)
                    );
                    break;
                }

                if (optinclude.has(Node.processingInstruction)) {
                    yield [
                        Node.processingInstruction,
                        input.slice(chunkPos, piClose)
                    ];
                }

                chunkPos = piClose + 2;
                continue;
            }

            // Recognize regular tags (< ... >)
            const tagClose = input.indexOf('>', chunkPos);

            if (tagClose === -1) {
                wait(
                    Node.tagOpen,
                    input.slice(chunkPos - 1)
                );
                break;
            }

            // Check if the tag is a closing tag
            if (input[chunkPos] === '/') {
                const tagName = input.slice(chunkPos + 1, tagClose);
                const stackedTagName = tagStack.pop();

                if (stackedTagName !== tagName) {
                    tagStack.length = 0;
                    throw new Error(`Unclosed tag: ${stackedTagName}`);
                }

                if (optinclude.has(Node.tagClose)) {
                    yield [
                        Node.tagClose,
                        tagName
                    ];
                }

                chunkPos = tagClose + 1;
                continue;
            }

            // Check if the tag is self-closing
            const isSelfClosing = input[tagClose - 1] === '/';
            let realTagClose = isSelfClosing ? tagClose - 1 : tagClose;

            // Extract the tag name and attributes
            const whitespace = input.slice(chunkPos).search(/\s/);

            if (whitespace === -1 || whitespace >= tagClose - chunkPos) {
                // Tag without any attribute
                const toYield = handleTagOpening({
                    name: input.slice(chunkPos, realTagClose),
                    attrs: '',
                    isSelfClosing
                });
                if (toYield) yield toYield;

            } else if (whitespace === 0) {
                throw new Error('Tag names may not start with whitespace');
            } else {
                // Tag with attributes
                const toYield = handleTagOpening({
                    name: input.slice(chunkPos, chunkPos + whitespace),
                    attrs: input.slice(chunkPos + whitespace, realTagClose),
                    isSelfClosing
                });
                if (toYield) yield toYield;
            }

            if (isSelfClosing && optCloseTagOnSelfClose) {
                yield ['tagclose', input.slice(chunkPos, realTagClose)];
            }

            chunkPos = tagClose + 1;
        }

    }  // end for await (let input of sourceIterator)

    // Handle unclosed nodes
    if (waiting !== null) {
        switch (waiting.token) {
        case Node.text:
            // Text nodes are implicitly closed
            yield [
                'text',
                waiting.data
            ];
            break;
        case Node.cdata:
            throw new Error('Unclosed CDATA section');
        case Node.comment:
            throw new Error('Unclosed comment');
        case Node.processingInstruction:
            throw new Error('Unclosed processing instruction');
        case Node.tagOpen:
        case Node.tagClose:
            // We do not distinguish between unclosed opening
            // or unclosed closing tags
            throw new Error('Unclosed tag');
        default:
            // Pass
        }
    }

    if (tagStack.length !== 0) {
        throw new Error(
            `Unclosed tags: ${tagStack.join(',')}`
        );
    }
}

module.exports = xmlNodeGenerator;

