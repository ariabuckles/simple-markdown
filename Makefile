.PHONY: all install test

all: install test

install:
	npm install

# Tricks to work with both linux and mac os x `find`,
# taken from Perseus:
FIND_TESTS_1 := find -E __tests__ -type f -regex '.*\.jsx?'
FIND_TESTS_2 := find __tests__ -type f -regex '.*\.jsx?'

ifneq ("$(shell $(FIND_TESTS_1) 2>/dev/null)","")
FIND_TESTS := $(FIND_TESTS_1)
else
ifneq ("$(shell $(FIND_TESTS_2) 2>/dev/null)","")
FIND_TESTS := $(FIND_TESTS_2)
else
FIND_TESTS := echo "Could not figure out how to run tests; skipping"; echo ""
endif
endif

test:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter spec -r jsx-harmony.js
shorttest:
	$(FIND_TESTS) | xargs ./node_modules/.bin/mocha --reporter dot -r jsx-harmony.js
