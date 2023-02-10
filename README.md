# async-saxophone

[![Not Maintained](https://img.shields.io/badge/Maintenance%20Level-Abandoned-orange.svg)](https://gist.github.com/cheerfulstoic/d107229326a01ff0f333a1d3476e068d)


async-saxophone is **no longer being actively developed** and has been archived. 

It was developed as a asynchronous replacement for saxophone, but has not kept up with changes to saxophone. If this is of interest, you probably need
to examine how saxophone was made asynchronous and apply similar changes to saxophone's current code.
You are still welcome to use it but you may want to check for any forks that are more actively maintained.
If it is of value to you, you are welcome to fork it or start a new project and incorporate its code into your project.

## Description

Fast and lightweight asynchonous XML parser in pure JavaScript.

Async-saxophone is based upon [Saxophone](https://github.com/matteodelabre/saxophone), which, in turn, is inspired by SAX parsers such as [sax-js](https://github.com/isaacs/sax-js) and [EasySax](https://github.com/vflash/easysax): unlike most XML parsers, but like Saxophone, async-saxophone does not create a Document Object Model ([DOM](https://en.wikipedia.org/wiki/Document_Object_Model)) tree as a result of parsing documents.

Instead, it implements an async iterator. Async-saxophone takes as input an XML document in the form of a string or any iterable, including a stream. It parses the XML and then outputs the nodes (tags, text, comments, etc) encountered as they are parsed. As an async iterator, it is suitable for iteration using `for await...of`.

Async-saxophone was developed to assure that a new chunk of XML is not taken from its input until all nodes encountered have been processed, even if there is delay in processing. The asynchronous design assures synchronization of input and output.

The async-saxophone parser is based upon the Saxophone parser and inherits its light weight and speed. It does not maintain document state nor check the validity of the document. Modifications to the Saxophone parser include structuring it as an async generator function, substituting `yield` for `emit`, expecting an input string or iterable as an argument, rather than being piped to, and representing each node as a tuple-like array.

The parser does not parse the attribute string in a tag nor does it parse entities in text. `Saxophone`'s `parseAttrs` and `parseEntities` functions may be used to parse the attribute string or entities. To avoid unnecessary dependencies, `Saxophone` must be installed seperately if these functions are needed.

Note that if a generator function is passed as the iteratable, a `"sourceIterator is not async iterable"` error will be thrown. Consider a generator function to be a iterable factory. Call it to get the iterator. If a generator `async function* genxml() {...}` is defined, pass `genxml()` to the parser rather than `genxml`.

## Installation

This package requires Node.JS 10.0 or later. It may also work in recent browsers that support async generator functions and `for await...of`.
To install with `npm`:

```sh
$ npm install async-saxophone
```

## Tests

To run tests, use the following commands:

```sh
$ git clone https://github.com/randymized/async-saxophone.git
$ cd async-saxophone
$ npm install
$ npm test
```

## Example

```js
const {makeAsyncXMLParser} = require('async-saxophone');
const delay = ms => new Promise(_ => setTimeout(_, ms));

const xml = '<root><example id="1" /><example id="2" /></root>'

async function main() {
    const parser = makeAsyncXMLParser();
    for await (let node of parser(xml)) {
        console.dir(node);
        await delay(500);
    }
    console.log('done')
}
main().catch(console.error)
```

Output:

```sh
[ 'tagopen', 'root', '', '' ]
[ 'tagopen', 'example', 'id="1"', '/' ]
[ 'tagopen', 'example', 'id="2"', '/' ]
[ 'tagclose', 'root' ]
done
```

### Exports:

`const {makeAsyncXMLParser} = require('async-saxophone');`


* **`makeAsyncXMLParser(options)`** takes parser options and returns a generator function that will parse an XML document.
    * `options` are detailed below.
    * `parser(iterable)` is the async generator function returned from `makeAsyncXMLParser`.
        * It takes as an argument any iterable of an XML document.
        * It returns an async iterator over the nodes encountered as the document is parsed.

* **options**
    * `include`: a list of node types to be output. See `AvailableNodes` above for a complete list. If option = `{include:['tagopen','tagclose']}`, for example, only opening and closing tags will be output. If `include` is not specified, all nodes will be output.
    * `alwaysTagClose`: If a self-closing tag is encountered a `tagclose` node will be output
    * `noEmptyText`: If truish, empty text nodes, or text that is all whitespace will not be output.

### Output:

The parser returned from `makeAsyncXMLParser` is an async generator function. It takes an iterable as an argument and returns an async iterator over the nodes encountered during parsing. The types of nodes and their representation is as follows:

- **tagopen**: `['tagopen', tag-name, attr-string, is-self-closing]`.
  - `tag-name` the tag's name, as found in the XML: <tag-name ...>
  - `attr-string` everything between the tag name and `>` or `/>`. This string may be parsed with `Saxophone.parseAttrs` to convert it into a key/value object. Any leading or trailing whitespace will be trimmed off.
  - `is-self-closing` will be either '/' (truish) if the tag is self-closing or '' (falsish) if it is not.
- **tagclose**: `['tagclose', tag-name]`
- **text**: `['text',content]`. Entities in the text may be parsed with the `Saxophone.parseEntities` function.
- **cdata**: `['cdata',content]`
- **commment**: `['comment',content]`
- **processinginstruction**: `['processinginstruction',content]`. Content of the processing instruction is not parsed.

## Contributions

This is free and open source software. All contributions (even small ones) are welcome. [Check out the contribution guide to get started!](CONTRIBUTING.md)

Thanks to:

* [Mattéo Delabre](https://github.com/matteodelabre) for Saxophone. The (modified) Saxophone parser is at the heart of this package.
* [Norman Rzepka](https://github.com/normanrz) for the check in Saxophone for opening and closing tags mismatch.
* [winston01](https://github.com/winston01) for spotting and fixing an error in the Saxophone parser when a tag sits astride two chunks.

## License

Released under the MIT license. [See the full license text.](LICENSE)
