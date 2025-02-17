run:
	bun run index.ts
build:
	bun run build
publish: build
	npm publish --access public
diagram:
	bun run flow.ts
listen:
	sh listen.sh
c4:
	docker run -it --rm -p 8090:8080 -v ${PWD}/diagrams:/usr/local/structurizr structurizr/lite