all:
	python ~/Projects/emscripten/emcc -O2 -s EXPORTED_FUNCTIONS="['_tessellate', '_malloc', '_free']" dict.c mesh.c render.c tess.c geom.c memalloc.c normal.c priorityq.c sweep.c tessmono.c tessellate.c -o _tessellate.js
	gcc dict.c mesh.c render.c tess.c geom.c memalloc.c normal.c priorityq.c sweep.c tessmono.c tessellate.c main.c -o tessellate
