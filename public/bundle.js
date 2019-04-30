var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = {};
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	/* src\app.svelte generated by Svelte v3.1.0 */

	const file = "src\\app.svelte";

	function create_fragment(ctx) {
		var div6, div0, h2, t1, p0, t3, div1, a0, t5, a1, t7, a2, t9, div2, h30, t11, p1, t12, a3, t14, t15, p2, t16, a4, t18, t19, p3, t20, a5, t22, t23, div3, h31, t25, p4, a6, t27, a7, t29, t30, p5, a8, t32, t33, p6, a9, t35, a10, t37, t38, p7, a11, t40, a12, t42, t43, p8, a13, t45, p9, a14, t47, p10, a15, t49, p11, a16, t51, p12, a17, t53, p13, a18, t55, p14, a19, t57, t58, p15, a20, t60, a21, t62, t63, p16, a22, t65, p17, a23, t67, p18, a24, t69, p19, a25, t71, p20, a26, t73, div4, h32, t75, div5, p21, em;

		return {
			c: function create() {
				div6 = element("div");
				div0 = element("div");
				h2 = element("h2");
				h2.textContent = "Eric Mendes Dantas";
				t1 = space();
				p0 = element("p");
				p0.textContent = "ericdantas0@gmail.com";
				t3 = space();
				div1 = element("div");
				a0 = element("a");
				a0.textContent = "Github";
				t5 = text("\n\t\t•\n\t\t");
				a1 = element("a");
				a1.textContent = "LinkedIn";
				t7 = text("\n\t\t•\n\t\t");
				a2 = element("a");
				a2.textContent = "Facebook";
				t9 = space();
				div2 = element("div");
				h30 = element("h3");
				h30.textContent = "Perfil";
				t11 = space();
				p1 = element("p");
				t12 = text("Nascido e criado em Teresópolis/RJ, sou formado em Ciência da Computação pela ");
				a3 = element("a");
				a3.textContent = "Unifeso";
				t14 = text(".");
				t15 = space();
				p2 = element("p");
				t16 = text("Após terminar a faculdade fui contratado pela ");
				a4 = element("a");
				a4.textContent = "Alterdata";
				t18 = text(" - onde descobri minha paixão por programação - em especial pela web.");
				t19 = space();
				p3 = element("p");
				t20 = text("Depois de anos na profissão, resolvi que meu conhecimento deveria ser repassado. Foi aí que comecei ");
				a5 = element("a");
				a5.textContent = "meus projetos Open Source";
				t22 = text(", onde tanto crio projetos do zero quanto ajudo outras pessoas ou organizações a manter os seus projetos - seja com código, documentação ou respondendo issues.");
				t23 = space();
				div3 = element("div");
				h31 = element("h3");
				h31.textContent = "Open source";
				t25 = space();
				p4 = element("p");
				a6 = element("a");
				a6.textContent = "ericmdantas/aliv";
				t27 = text(" é um servidor HTTP e proxy reverso em ");
				a7 = element("a");
				a7.textContent = "Node";
				t29 = text(". Criado em 2016 com o foco em ser um servidor simples de configurar, leve e rápido para rodar e atender algumas necessidades específicas. O projeto foi primordial para agilizar e organizar projetos que dependiam de configurações mais complexas. Desde configurações de certificado para servir estáticos em HTTP/2 até fazer proxies para servidores externos.");
				t30 = space();
				p5 = element("p");
				a8 = element("a");
				a8.textContent = "ericmdantas/generator-ng-fullstack";
				t32 = text(" é um gerador de projetos web fullstack. São apresentadas algumas perguntas para o desenvolvedor e conforme as perguntas vão sendo respondidas, o projeto vai se auto configurando - já com toda a estrutura funcional, com conexões com banco e testes unitários prontos para rodar. Perguntas como: Qual linguagem será utilizada no backend? Prefere utilizar este webframework ou aquele? Utilizar a compilação pelo Babel ou Typescript? Entre outras. Foi criado em 2015 e ainda é utilizado por desenvolvedores no mundo todo.");
				t33 = space();
				p6 = element("p");
				a9 = element("a");
				a9.textContent = "ericmdantas/generator-angularjs-module";
				t35 = text(" é um gerador de boilerplate para libs escritas em AngularJS. O projeto já configura todos os pontos de organização do fonte e testes - com integração com o ");
				a10 = element("a");
				a10.textContent = "TravisCI";
				t37 = text(".");
				t38 = space();
				p7 = element("p");
				a11 = element("a");
				a11.textContent = "ericmdantas/generator-angularjs-module";
				t40 = text(" é um gerador de boilerplate para libs Node. O projeto já configura todos os pontos de fonte e testes - com integração com o ");
				a12 = element("a");
				a12.textContent = "TravisCI";
				t42 = text(".");
				t43 = space();
				p8 = element("p");
				a13 = element("a");
				a13.textContent = "ericmdantas/ng-xtorage";
				t45 = space();
				p9 = element("p");
				a14 = element("a");
				a14.textContent = "ericmdantas/xtorage";
				t47 = space();
				p10 = element("p");
				a15 = element("a");
				a15.textContent = "ericmdantas/μBus";
				t49 = space();
				p11 = element("p");
				a16 = element("a");
				a16.textContent = "ericmdantas/express-content-length-validator";
				t51 = space();
				p12 = element("p");
				a17 = element("a");
				a17.textContent = "ericmdantas/vue-floating-alert";
				t53 = space();
				p13 = element("p");
				a18 = element("a");
				a18.textContent = "ericmdantas/vue-simple-snackbar";
				t55 = space();
				p14 = element("p");
				a19 = element("a");
				a19.textContent = "ericmdantas/angular2-typescript-todo";
				t57 = text(" era um boilerplate que foi utilizado como base de aprendizado por desenvolvedores que estavam começando a aprender Angular2. Foi criado quando a versão do Angular2 ainda estava em alpha e as mudanças eram quase que diárias. Este respositório dava aos desenvolvedores um lembrete das sintaxes e dependencias utilizadas para criar a aplicação e manter os testes rodando.");
				t58 = space();
				p15 = element("p");
				a20 = element("a");
				a20.textContent = "ericmdantas/goliv";
				t60 = text(" também é um servidor HTTP e proxy reverso, a única diferença para o `aliv` é que este foi escrito em ");
				a21 = element("a");
				a21.textContent = "Go";
				t62 = text(".");
				t63 = space();
				p16 = element("p");
				a22 = element("a");
				a22.textContent = "angular/angular";
				t65 = space();
				p17 = element("p");
				a23 = element("a");
				a23.textContent = "labstack/echo";
				t67 = space();
				p18 = element("p");
				a24 = element("a");
				a24.textContent = "rakyll/hey";
				t69 = space();
				p19 = element("p");
				a25 = element("a");
				a25.textContent = "radovskyb/watcher";
				t71 = space();
				p20 = element("p");
				a26 = element("a");
				a26.textContent = "VividCortex/angular-recaptcha";
				t73 = space();
				div4 = element("div");
				h32 = element("h3");
				h32.textContent = "Projetos diversos";
				t75 = space();
				div5 = element("div");
				p21 = element("p");
				em = element("em");
				em.textContent = "Última atualização em: 30/04/2019";
				h2.className = "nome svelte-isj4eb";
				add_location(h2, file, 42, 2, 440);
				p0.className = "email svelte-isj4eb";
				add_location(p0, file, 43, 2, 483);
				div0.className = "centered svelte-isj4eb";
				add_location(div0, file, 41, 1, 415);
				a0.href = "https://github.com/ericmdantas";
				a0.className = "svelte-isj4eb";
				add_location(a0, file, 47, 2, 558);
				a1.href = "https://www.linkedin.com/in/eric-dantas-8833a1167/";
				a1.className = "svelte-isj4eb";
				add_location(a1, file, 49, 2, 616);
				a2.href = "https://facebook.com/ericmdantas";
				a2.className = "svelte-isj4eb";
				add_location(a2, file, 51, 2, 696);
				div1.className = "links svelte-isj4eb";
				add_location(div1, file, 46, 1, 536);
				add_location(h30, file, 55, 2, 794);
				a3.href = "http://www.unifeso.edu.br/";
				a3.className = "svelte-isj4eb";
				add_location(a3, file, 56, 83, 893);
				add_location(p1, file, 56, 2, 812);
				a4.href = "https://alterdata.com.br";
				a4.className = "svelte-isj4eb";
				add_location(a4, file, 57, 51, 998);
				add_location(p2, file, 57, 2, 949);
				a5.href = "https://github.com/ericmdantas";
				a5.className = "svelte-isj4eb";
				add_location(a5, file, 58, 105, 1225);
				add_location(p3, file, 58, 2, 1122);
				attr(div2, "clas", "perfil-container");
				add_location(div2, file, 54, 1, 762);
				add_location(h31, file, 62, 2, 1477);
				a6.href = "https://github.com/ericmdantas/aliv";
				a6.className = "svelte-isj4eb";
				add_location(a6, file, 65, 3, 1508);
				a7.href = "https://nodejs.org/en/";
				a7.className = "svelte-isj4eb";
				add_location(a7, file, 65, 108, 1613);
				add_location(p4, file, 64, 2, 1501);
				a8.href = "https://github.com/ericmdantas/generator-ng-fullstack";
				a8.className = "svelte-isj4eb";
				add_location(a8, file, 69, 3, 2028);
				add_location(p5, file, 68, 2, 2021);
				a9.href = "https://github.com/ericmdantas/generator-angularjs-module";
				a9.className = "svelte-isj4eb";
				add_location(a9, file, 73, 3, 2665);
				a10.href = "http://travis-ci.org";
				a10.className = "svelte-isj4eb";
				add_location(a10, file, 73, 270, 2932);
				add_location(p6, file, 72, 2, 2658);
				a11.href = "https://github.com/ericmdantas/generator-nodejs-module";
				a11.className = "svelte-isj4eb";
				add_location(a11, file, 77, 3, 2994);
				a12.href = "http://travis-ci.org";
				a12.className = "svelte-isj4eb";
				add_location(a12, file, 77, 235, 3226);
				add_location(p7, file, 76, 2, 2987);
				a13.href = "https://github.com/ericmdantas/ng-xtorage";
				a13.className = "svelte-isj4eb";
				add_location(a13, file, 81, 3, 3288);
				add_location(p8, file, 80, 2, 3281);
				a14.href = "https://github.com/ericmdantas/xtorage";
				a14.className = "svelte-isj4eb";
				add_location(a14, file, 85, 3, 3384);
				add_location(p9, file, 84, 2, 3377);
				a15.href = "https://github.com/ericmdantas/uBus";
				a15.className = "svelte-isj4eb";
				add_location(a15, file, 89, 3, 3474);
				add_location(p10, file, 88, 2, 3467);
				a16.href = "https://github.com/ericmdantas/express-content-length-validator";
				a16.className = "svelte-isj4eb";
				add_location(a16, file, 93, 3, 3558);
				add_location(p11, file, 92, 2, 3551);
				a17.href = "https://github.com/ericmdantas/vue-floating-alert";
				a17.className = "svelte-isj4eb";
				add_location(a17, file, 97, 3, 3698);
				add_location(p12, file, 96, 2, 3691);
				a18.href = "https://github.com/ericmdantas/vue-floating-alert";
				a18.className = "svelte-isj4eb";
				add_location(a18, file, 101, 3, 3810);
				add_location(p13, file, 100, 2, 3803);
				a19.href = "https://github.com/ericmdantas/vue-floating-alert";
				a19.className = "svelte-isj4eb";
				add_location(a19, file, 105, 3, 3923);
				add_location(p14, file, 104, 2, 3916);
				a20.href = "https://github.com/ericmdantas/goliv";
				a20.className = "svelte-isj4eb";
				add_location(a20, file, 109, 3, 4410);
				a21.href = "https://golang.org/project/";
				a21.className = "svelte-isj4eb";
				add_location(a21, file, 109, 173, 4580);
				add_location(p15, file, 108, 2, 4403);
				a22.href = "https://github.com/angular/angular";
				a22.className = "svelte-isj4eb";
				add_location(a22, file, 113, 3, 4643);
				add_location(p16, file, 112, 2, 4636);
				a23.href = "https://github.com/labstack/echo";
				a23.className = "svelte-isj4eb";
				add_location(a23, file, 117, 3, 4725);
				add_location(p17, file, 116, 2, 4718);
				a24.href = "https://github.com/rakyll/hey";
				a24.className = "svelte-isj4eb";
				add_location(a24, file, 121, 3, 4803);
				add_location(p18, file, 120, 2, 4796);
				a25.href = "https://github.com/radovskyb/watcher";
				a25.className = "svelte-isj4eb";
				add_location(a25, file, 125, 3, 4875);
				add_location(p19, file, 124, 2, 4868);
				a26.href = "https://github.com/VividCortex/angular-recaptcha";
				a26.className = "svelte-isj4eb";
				add_location(a26, file, 129, 3, 4961);
				add_location(p20, file, 128, 2, 4954);
				add_location(div3, file, 61, 1, 1469);
				add_location(h32, file, 134, 2, 5079);
				add_location(div4, file, 133, 1, 5071);
				add_location(em, file, 138, 5, 5127);
				add_location(p21, file, 138, 2, 5124);
				add_location(div5, file, 137, 1, 5116);
				add_location(div6, file, 40, 0, 408);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div6, anchor);
				append(div6, div0);
				append(div0, h2);
				append(div0, t1);
				append(div0, p0);
				append(div6, t3);
				append(div6, div1);
				append(div1, a0);
				append(div1, t5);
				append(div1, a1);
				append(div1, t7);
				append(div1, a2);
				append(div6, t9);
				append(div6, div2);
				append(div2, h30);
				append(div2, t11);
				append(div2, p1);
				append(p1, t12);
				append(p1, a3);
				append(p1, t14);
				append(div2, t15);
				append(div2, p2);
				append(p2, t16);
				append(p2, a4);
				append(p2, t18);
				append(div2, t19);
				append(div2, p3);
				append(p3, t20);
				append(p3, a5);
				append(p3, t22);
				append(div6, t23);
				append(div6, div3);
				append(div3, h31);
				append(div3, t25);
				append(div3, p4);
				append(p4, a6);
				append(p4, t27);
				append(p4, a7);
				append(p4, t29);
				append(div3, t30);
				append(div3, p5);
				append(p5, a8);
				append(p5, t32);
				append(div3, t33);
				append(div3, p6);
				append(p6, a9);
				append(p6, t35);
				append(p6, a10);
				append(p6, t37);
				append(div3, t38);
				append(div3, p7);
				append(p7, a11);
				append(p7, t40);
				append(p7, a12);
				append(p7, t42);
				append(div3, t43);
				append(div3, p8);
				append(p8, a13);
				append(div3, t45);
				append(div3, p9);
				append(p9, a14);
				append(div3, t47);
				append(div3, p10);
				append(p10, a15);
				append(div3, t49);
				append(div3, p11);
				append(p11, a16);
				append(div3, t51);
				append(div3, p12);
				append(p12, a17);
				append(div3, t53);
				append(div3, p13);
				append(p13, a18);
				append(div3, t55);
				append(div3, p14);
				append(p14, a19);
				append(p14, t57);
				append(div3, t58);
				append(div3, p15);
				append(p15, a20);
				append(p15, t60);
				append(p15, a21);
				append(p15, t62);
				append(div3, t63);
				append(div3, p16);
				append(p16, a22);
				append(div3, t65);
				append(div3, p17);
				append(p17, a23);
				append(div3, t67);
				append(div3, p18);
				append(p18, a24);
				append(div3, t69);
				append(div3, p19);
				append(p19, a25);
				append(div3, t71);
				append(div3, p20);
				append(p20, a26);
				append(div6, t73);
				append(div6, div4);
				append(div4, h32);
				append(div6, t75);
				append(div6, div5);
				append(div5, p21);
				append(p21, em);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div6);
				}
			}
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body,
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map
