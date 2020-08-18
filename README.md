# async-saxophone

Fast and lightweight asynchonous XML parser in pure JavaScript.

Async-saxophone is based upon [Saxophone](https://github.com/matteodelabre/saxophone), which, in turn, is inspired by SAX parsers such as [sax-js](https://github.com/isaacs/sax-js) and [EasySax](https://github.com/vflash/easysax): unlike most XML parsers, but like Saxophone, async-saxophone does not create a Document Object Model ([DOM](https://en.wikipedia.org/wiki/Document_Object_Model)) tree as a result of parsing documents.

Instead, it implements an async iterator. Async-saxophone takes as input an XML document in the form of a string or any iterator, including a stream. It parses the XML and then outputs the nodes (tags, text, comments, etc) encountered as they are parsed. As an async iterator, it is suitable for iteration using `for await...of`.

Async-saxophone was developed to assure that a new chunk of XML is not taken from its input until all nodes encountered have been processed, even if there is delay in processing. The asynchronous design assures synchronization of input and output.

The async-saxophone parser is based upon the Saxophone parser and inherits its light weight and speed. It does not maintain document state nor check the validity of the document. Modifications to the Saxophone parser include structuring it as an async generator function, substituting `yield` for `emit`, expecting an input string or iterator as an argument, rather than being piped to, and representing each node as a tuple-like array.

The parser does not parse the attribute string in a tag nor does it parse entities in text. `Saxophone`'s `parseAttrs` and `parseEntities` functions are exported as a convenience for parsing attribute strings into an object and for parsing entities.

## Installation

This package requires Node.JS 10.0 or later. It may also work in recent browsers that support async generator functions and `for await...of`.
To install with `npm`:

```sh
$ npm install async-saxophone
```

## Tests and coverage

To run tests, use the following commands:

```sh
$ git clone https://github.com/randymized/async-saxophone.git
$ cd async-saxophone
$ npm install
$ npm test
```

## Example

```js
const {xmlNodeGenerator} = require('async-saxophone');
const delay = ms => new Promise(_ => setTimeout(_, ms));

const xml = '<root><example id="1" /><example id="2" /></root>'

async function main() {
    for await (let node of xmlNodeGenerator(xml)) {
        console.dir(node);
        await delay(500);
    }
}
main().catch(console.error)
```

Output:

```sh
[ 'tagopen', 'root', '', '' ]
[ 'tagopen', 'example', 'id="1"', '/' ]
[ 'tagopen', 'example', 'id="2"', '/' ]
[ 'tagclose', 'root' ]
```

### Exports:

`const {xmlNodeGenerator,parseAttrs,parseEntities}= require('async-saxophone');`


- **`xmlNodeGenerator(iterator)`** is an async generator function.
It takes as an argument any iterator over an XML document.
It returns an async iterator over then nodes encountered as the document is parsed.

- **parseAttrs**
As a convenience, [Saxophone.parseAttrs](https://www.npmjs.com/package/saxophone#saxophoneparseattrsattrs) is exported by this package. It parses a string of XML attributes, such as would be output as a result of parsing an opening tag.

- **parseEntities**
As a convenience, [Saxophone.parseEntities](https://www.npmjs.com/package/saxophone#saxophoneparseentitiestext) is exported by this package. It expands all XML entities in a string to the characters represented by the entities.

### Output:

`xmlNodeGenerator` is an async generator function, it implements an iterator over the nodes encountered during parsing. The types of nodes and their representation is as follows:

- **tagopen**: `['tagopen', tag-name, attr-string, is-self-closing]`.
-- `attr-string` may be parsed with `parseAttrs` to convert it into a key/value object. Any leading or trailing whitespace will be trimmed off.
-- `is-self-closing` will be either '/' (truish) if the tag is self-closing or '' (falsish) if it is not.
- **tagclose**: `['tagclose', tag-name]`
- **text**: `['text',content]`. Entities in the text may be parsed with the `parseEntities` function.
- **cdata**: `['cdata',content]`
- **commment**: `['comment',content]`
- **processinginstruction**: `['processinginstruction',content]`. Content of the processing instruction is not parsed.

## Contributions

This is free and open source software. All contributions (even small ones) are welcome. [Check out the contribution guide to get started!](CONTRIBUTING.md)

Thanks to:

* [Mattéo Delabre](https://github.com/matteodelabre) for Saxophone. The Saxophone parser is at the heart of this package.
* [Norman Rzepka](https://github.com/normanrz) for the check for opening and closing tags mismatch.
* [winston01](https://github.com/winston01) for spotting and fixing an error in the parser when a tag sits astride two chunks.

## License

Released under the MIT license. [See the full license text.](LICENSE)
