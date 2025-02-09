run:
	bun run index.ts
diagram:
	bun run flow.ts
listen:
	sh listen.sh
watch:
	docker logs -ft aa1bcedd358c
c4:
	docker run -it --rm -p 8090:8080 -v ${PWD}/diagrams:/usr/local/structurizr structurizr/lite