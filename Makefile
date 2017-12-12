.PHONY: all install test debug size minify simple-markdown.min.js

all: install test size

install:
	npm install

minify: simple-markdown.min.js

FIND_TESTS := find __tests__ -type f -regex '.*\.js'

test:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter spec
shorttest:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter dot

# Start a chrome debugger for test case(s). Usage:
# `make debug` or `make debug TEST="part of a test name"`
TEST?=ALL
debug:
	@echo 'make debug'
	@echo "TEST=$(TEST)"
	@echo 'usage: `make debug` or `make debug TEST="part of a test name"`'
	@echo 'starting debugger at chrome://inspect ...'
	@echo ''
ifeq ($(TEST),ALL)
	./node_modules/.bin/mocha __tests__ --inspect-brk
else
	./node_modules/.bin/mocha __tests__ --inspect-brk --grep "$(TEST)"
endif

size:
	./node_modules/.bin/size-limit

simple-markdown.min.js: simple-markdown.js
	uglifyjs simple-markdown.js > simple-markdown.min.js
