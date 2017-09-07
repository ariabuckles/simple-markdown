.PHONY: all install test check minify

all: install check test minify

install:
	npm install

minify: simple-markdown.min.js

FIND_TESTS := find __tests__ -type f -regex '.*\.js'

test: runtest check

check:
	./node_modules/.bin/flow

runtest:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter spec
shorttest:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter dot

simple-markdown.min.js: simple-markdown.js
	uglifyjs simple-markdown.js > simple-markdown.min.js
