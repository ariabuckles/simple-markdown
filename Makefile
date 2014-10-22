.PHONY: all install test

all: install test

install:
	npm install

FIND_TESTS := find __tests__ -type f -regex '.*\.js'

test:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter spec
shorttest:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter dot
