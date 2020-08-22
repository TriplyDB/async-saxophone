const test = require('tape-async');
const tags = require('common-tags');

const {makeAsyncXMLParser} = require('./index');

const delay = ms => new Promise(_ => setTimeout(_, ms));

const allNodes = tags.stripIndent`
<?xml version="1.0" encoding="UTF-8"?>
<!-- this is a comment -->
<title>XML Test File</title>
<selfclose />
<cdata-section><![CDATA[this is a c&data s<>ction]]></cdata-section>
<empty></empty>
<hasattrs first="one" second="two"  third="three " />
<textarea> this\nis\na\r\n\ttextual\ncontent  </textarea>
<other attr="value"></other>`;

const openAndClose = '<full></full><selfclose />';

/**
 * Verify that an XML text is parsed as the specified stream of events.
 *
 * @param assert Assertion function.
 * @param xml XML string or array of XML chunks.
 * @param events Sequence of events that must be emitted in order.
 */
const expectEvents = (assert, xml, events, options) => {
    if (!Array.isArray(xml)) {
        // By default, split data in chunks of size 10
        const chunks = [];

        for (let i = 0; i < xml.length; i += 10) {
            chunks.push(xml.slice(i, i + 10));
        }

        xml = chunks;
    }

    const results = [];

    (async function () {
        for await (let node of makeAsyncXMLParser(options)(xml)) {
            results.push(node);
        }
    }()).then(() => {
        assert.deepEqual(
            results, events,
            'parsed data should be as expected'
        );
        assert.end();
    }).catch((err) => {
        results.push(err.toString());
        assert.deepEqual(
            results, events,
            'an exception was thrown'
        );
        assert.end();
    });
};

test('should parse comments', assert => {
    expectEvents(assert,
        '<!-- this is a comment -->',
        [['comment', ' this is a comment ']]
    );
});

test('should parse comments between two chunks', assert => {
    expectEvents(assert,
        ['<', '!', '-', '-', ' this is a comment -->'],
        [['comment', ' this is a comment ']]
    );
});

test('should not parse unclosed comments', assert => {
    expectEvents(assert,
        '<!-- this is a comment ->',
        [new Error('Unclosed comment').toString()]
    );
});

test('should not parse invalid comments', assert => {
    expectEvents(assert,
        '<!-- this is an -- invalid comment ->',
        [new Error('Unexpected -- inside comment').toString()]
    );
});

test('should parse CDATA sections', assert => {
    expectEvents(assert,
        '<![CDATA[this is a c&data s<>ction]]>',
        [['cdata', 'this is a c&data s<>ction']]
    );
});

test('should parse CDATA sections between two chunks', assert => {
    expectEvents(assert,
        ['<', '!', '[', 'C', 'D', 'A', 'T', 'A', '[', 'contents]]>'],
        [['cdata', 'contents']]
    );
});

test('should not parse invalid CDATA sections', assert => {
    expectEvents(assert,
        ['<![CDAthis is NOT a c&data s<>ction]]>'],
        [new Error('Unrecognized sequence: <![').toString()]
    );
});

test('should not parse unclosed CDATA sections', assert => {
    expectEvents(assert,
        '<![CDATA[this is a c&data s<>ction]>',
        [new Error('Unclosed CDATA section').toString()]
    );
});

test('should parse processing instructions', assert => {
    expectEvents(assert,
        '<?xml version="1.0" encoding="UTF-8" ?>',
        [['processinginstruction', 'xml version="1.0" encoding="UTF-8" ']]
    );
});

test('should not parse unclosed processing instructions', assert => {
    expectEvents(assert,
        '<?xml version="1.0" encoding="UTF-8">',
        [new Error('Unclosed processing instruction').toString()]
    );
});

test('should parse simple tags', assert => {
    expectEvents(assert,
        '<tag></tag>',
        [
            ['tagopen', 'tag', '', ''],
            ['tagclose', 'tag']
        ]
    );
});

test('should not parse unclosed opening tags', assert => {
    expectEvents(assert,
        '<tag',
        [new Error('Unclosed tag').toString()]
    );
});

test('should not parse unclosed tags 2', assert => {
    expectEvents(assert,
        '<tag>',
        [
            ['tagopen', 'tag', '', ''],
            new Error('Unclosed tags: tag').toString()
        ]
    );
});

test('should not parse unclosed tags 3', assert => {
    expectEvents(assert,
        '<closed><unclosed></closed>',
        [
            ['tagopen', 'closed', '', ''],
            ['tagopen', 'unclosed', '', ''],
            new Error('Unclosed tag: unclosed').toString()
        ]
    );
});

test('should not parse DOCTYPEs', assert => {
    expectEvents(assert,
        '<!DOCTYPE html>',
        [new Error('Unrecognized sequence: <!D').toString()]
    );
});

test('should not parse invalid tags', assert => {
    expectEvents(assert,
        '< invalid>',
        [new Error('Tag names may not start with whitespace').toString()]
    );
});

test('should parse self-closing tags', assert => {
    expectEvents(assert,
        '<test />',
        [['tagopen', 'test', '', '/']]
    );
});

test('should parse closing tags', assert => {
    expectEvents(assert,
        '<closed></closed>',
        [
            ['tagopen', 'closed', '', ''],
            ['tagclose', 'closed']
        ]
    );
});

test('should not parse unclosed closing tags', assert => {
    expectEvents(assert,
        '</closed',
        [new Error('Unclosed tag').toString()]
    );
});

test('should parse tags containing attributes', assert => {
    expectEvents(assert,
        '<tag first="one" second="two"  third="three " /><other attr="value"></other>',
        [
            ['tagopen', 'tag', 'first="one" second="two"  third="three "', '/'],
            ['tagopen', 'other', 'attr="value"', ''],
            ['tagclose', 'other']
        ]
    );
});

test('should parse text nodes', assert => {
    expectEvents(assert,
        '<textarea> this\nis\na\r\n\ttextual\ncontent  </textarea>',
        [
            ['tagopen', 'textarea', '', ''],
            ['text', ' this\nis\na\r\n\ttextual\ncontent  '],
            ['tagclose', 'textarea']
        ]
    );
});

test('should parse text nodes outside of the root element', assert => {
    expectEvents(assert,
        'before<root>inside</root>after',
        [
            ['text', 'before'],
            ['tagopen', 'root', '', ''],
            ['text', 'inside'],
            ['tagclose', 'root'],
            ['text', 'after']
        ]
    );
});

test('should parse a complete document', assert => {
    expectEvents(assert,
        tags.stripIndent`
            <?xml version="1.0" encoding="UTF-8" ?>
            <persons>
                <!-- List of persons -->
                <person name="Priscilla Z. Holden" address="320-2518 Taciti Street" />
                <person name="Raymond J. Garner" address="698-806 Dictum Road" />
                <person name="Alfonso T. Yang" address="3689 Dolor Rd." />
            </persons>
        `,
        [
            ['processinginstruction', 'xml version="1.0" encoding="UTF-8" '],
            ['text', '\n'],
            ['tagopen', 'persons', '', ''],
            ['text', '\n    '],
            ['comment', ' List of persons '],
            ['text', '\n    '],
            ['tagopen', 'person', 'name="Priscilla Z. Holden" address="320-2518 Taciti Street"', '/'],
            ['text', '\n    '],
            ['tagopen', 'person', 'name="Raymond J. Garner" address="698-806 Dictum Road"', '/'],
            ['text', '\n    '],
            ['tagopen', 'person', 'name="Alfonso T. Yang" address="3689 Dolor Rd."', '/'],
            ['text', '\n'],
            ['tagclose', 'persons']
        ]
    );
});

test('should allow selecting only open tags', assert => {
    expectEvents(assert,
        allNodes,
        [
            [ 'tagopen', 'title', '', '' ],
            [ 'tagopen', 'selfclose', '', '/' ],
            [ 'tagopen', 'cdata-section', '', '' ],
            [ 'tagopen', 'empty', '', '' ],
            [ 'tagopen', 'hasattrs', 'first="one" second="two"  third="three "', '/' ],
            [ 'tagopen', 'textarea', '', '' ],
            [ 'tagopen', 'other', 'attr="value"', '' ]
        ],
        {include: 'tagopen'}
    );
});

test('should allow selecting only closing tags', assert => {
    expectEvents(assert,
        allNodes,
        [
            [ 'tagclose', 'title' ],
            [ 'tagclose', 'cdata-section' ],
            [ 'tagclose', 'empty' ],
            [ 'tagclose', 'textarea' ],
            [ 'tagclose', 'other' ]
        ],
        {include: 'tagclose'}
    );
});

test('should allow selecting only opening and closing tags and text', assert => {
    expectEvents(assert,
        allNodes,
        [
            [ 'tagopen', 'title', '', '' ],
            [ 'text', 'XML Test File' ],
            [ 'tagclose', 'title' ],
            [ 'tagopen', 'selfclose', '', '/' ],
            [ 'tagopen', 'cdata-section', '', '' ],
            [ 'tagclose', 'cdata-section' ],
            [ 'tagopen', 'empty', '', '' ],
            [ 'tagclose', 'empty' ],
            [ 'tagopen', 'hasattrs', 'first="one" second="two"  third="three "', '/' ],
            [ 'tagopen', 'textarea', '', '' ],
            [ 'text', ' this\nis\na\r\n\ttextual\ncontent  ' ],
            [ 'tagclose', 'textarea' ],
            [ 'tagopen', 'other', 'attr="value"', '' ],
            [ 'tagclose', 'other' ]
        ],
        {include: ['tagopen', 'tagclose', 'text'], noEmptyText:true}
    );
});

test('should allow selecting only comments', assert => {
    expectEvents(assert,
        allNodes,
        [
            [ 'comment', ' this is a comment ' ]
        ],
        {include: 'comment'}
    );
});

test('should allow selecting only cdata', assert => {
    expectEvents(assert,
        allNodes,
        [
            [ 'cdata', 'this is a c&data s<>ction' ]
        ],
        {include: 'cdata'}
    );
});

test('should allow selecting only processing instructions', assert => {
    expectEvents(assert,
        allNodes,
        [
            [ 'processinginstruction', 'xml version="1.0" encoding="UTF-8"' ]
        ],
        {include: 'processinginstruction'}
    );
});


test('should allow outputting tagclose for self-closing tags', assert => {
    expectEvents(assert,
        openAndClose,
        [
            [ 'tagopen', 'full', '', '' ],
            [ 'tagclose', 'full' ],
            [ 'tagopen', 'selfclose', '', '/' ],
            [ 'tagclose', 'selfclose ' ]
        ],
        {alwaysTagClose:true}
    );
});

test('should not add a tagclose for self-closing tags if no closeTagOnSelfClose option', assert => {
    expectEvents(assert,
        openAndClose,
        [
            [ 'tagopen', 'full', '', '' ],
            [ 'tagclose', 'full' ],
            [ 'tagopen', 'selfclose', '', '/' ]
        ],
        {closeTagOnSelfClose:false}
    );
});

test('should include text that is only whitespace by default', assert => {
    expectEvents(assert,
        `<full>something</full>
        <selfclose />`,
        [
            [ 'tagopen', 'full', '', '' ],
            [ 'text', 'something' ],
            [ 'tagclose', 'full' ],
            [ 'text', '\n        ' ],
            [ 'tagopen', 'selfclose', '', '/' ]
        ],
        {}
    );
});

test('should allow filtering out whitespace text', assert => {
    expectEvents(assert,
        `<full>something</full>
        <selfclose />`,
        [
            [ 'tagopen', 'full', '', '' ],
            [ 'text', 'something' ],
            [ 'tagclose', 'full' ],
            [ 'tagopen', 'selfclose', '', '/' ]
        ],
        {noEmptyText:true}
    );
});

test('inputs should wait on outputs and outputs wait on inputs', assert => {
    async function* genxml() {
        yield `<a ${Date.now()} />`;
        await delay(500);
        yield `<b ${Date.now()} />`;
    }
    async function main() {
        const parser = makeAsyncXMLParser();
        let prev = 0;
        for await (let node of parser(genxml())) {
            if (prev) {
                // expect at least 500 ms input and 500 ms output delay
                assert.ok(node[2] >= prev + 1000);
            } else {
                prev = node[2];
            }
            await delay(500);
        }
    }
    main().then(assert.end).catch(assert.fail);
});

test('should accept a string as input', assert => {
    async function main() {
        const parser = makeAsyncXMLParser();
        let accum = [];
        for await (let node of parser('<a />')) {
            accum.push(node);
        }
        assert.deepEqual(accum, [['tagopen', 'a', '', '/']]);
    }
    main().then(assert.end).catch(assert.fail);
});

test('should err on unclosed CDATA', assert => {
    expectEvents(assert,
        '<cdata-section><![CDATA[this is a c&data s<>ction',
        [
            [ 'tagopen', 'cdata-section', '', '' ],
            'Error: Unclosed CDATA section'
        ]
    );
});

test('should err on unclosed comment', assert => {
    expectEvents(assert,
        '<!-- this is an unclosed comment',
        [
            'Error: Unclosed comment'
        ]
    );
});

test('should err on unclosed processing instruction', assert => {
    expectEvents(assert,
        '<?xml version="1.0" encoding="UTF-8"?',
        [
            'Error: Unclosed processing instruction'
        ]
    );
});

test('should err on unclosed tag', assert => {
    expectEvents(assert,
        '<xml version="1.0" encoding="UTF-8"',
        [
            'Error: Unclosed tag'
        ]
    );
});

test('should err on unclosed tags', assert => {
    expectEvents(assert,
        '<a><b></b>',
        [
            [ 'tagopen', 'a', '', '' ],
            [ 'tagopen', 'b', '', '' ],
            [ 'tagclose', 'b' ],
            'Error: Unclosed tags: a'
        ]
    );
});

test('should parse text at end of the XML', assert => {
    expectEvents(assert,
        '<test />Extra text',
        [
            ['tagopen', 'test', '', '/'],
            [ 'text', 'Extra text' ]
        ]
    );
});
