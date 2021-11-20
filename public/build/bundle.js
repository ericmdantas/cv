
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\app.svelte generated by Svelte v3.44.2 */

    const file = "src\\app.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (26:3) {#each myContactLinks as link}
    function create_each_block(ctx) {
    	let a;
    	let t_value = /*link*/ ctx[1].description + "";
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "class", "contact-links svelte-1wkdbm2");
    			attr_dev(a, "href", /*link*/ ctx[1].url);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file, 26, 4, 571);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(26:3) {#each myContactLinks as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div12;
    	let section0;
    	let div0;
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let div1;
    	let t4;
    	let section1;
    	let div2;
    	let h30;
    	let t6;
    	let div3;
    	let p1;
    	let t7;
    	let a0;
    	let t9;
    	let t10;
    	let p2;
    	let t11;
    	let a1;
    	let t13;
    	let t14;
    	let p3;
    	let t15;
    	let a2;
    	let t17;
    	let t18;
    	let section2;
    	let div4;
    	let h31;
    	let t20;
    	let div5;
    	let p4;
    	let a3;
    	let t22;
    	let a4;
    	let t24;
    	let t25;
    	let p5;
    	let a5;
    	let t27;
    	let t28;
    	let p6;
    	let a6;
    	let t30;
    	let a7;
    	let t32;
    	let t33;
    	let p7;
    	let a8;
    	let t35;
    	let a9;
    	let t37;
    	let t38;
    	let p8;
    	let a10;
    	let t40;
    	let p9;
    	let a11;
    	let t42;
    	let p10;
    	let a12;
    	let t44;
    	let p11;
    	let a13;
    	let t46;
    	let p12;
    	let a14;
    	let t48;
    	let p13;
    	let a15;
    	let t50;
    	let p14;
    	let a16;
    	let t52;
    	let t53;
    	let p15;
    	let a17;
    	let t55;
    	let a18;
    	let t57;
    	let t58;
    	let p16;
    	let a19;
    	let t60;
    	let p17;
    	let a20;
    	let t62;
    	let p18;
    	let a21;
    	let t64;
    	let p19;
    	let a22;
    	let t66;
    	let p20;
    	let a23;
    	let t68;
    	let section3;
    	let div6;
    	let h32;
    	let t70;
    	let div7;
    	let t71;
    	let section4;
    	let div8;
    	let h33;
    	let t73;
    	let div9;
    	let t74;
    	let section5;
    	let div10;
    	let h34;
    	let t76;
    	let div11;
    	let t77;
    	let section6;
    	let small;
    	let em;
    	let each_value = /*myContactLinks*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			section0 = element("section");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Eric Mendes Dantas";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "ericdantas0@gmail.com";
    			t3 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			section1 = element("section");
    			div2 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Perfil";
    			t6 = space();
    			div3 = element("div");
    			p1 = element("p");
    			t7 = text("Nascido e criado em Teresópolis/RJ, sou formado em Ciência da Computação pela ");
    			a0 = element("a");
    			a0.textContent = "Unifeso";
    			t9 = text(".");
    			t10 = space();
    			p2 = element("p");
    			t11 = text("Após terminar a faculdade fui contratado pela ");
    			a1 = element("a");
    			a1.textContent = "Alterdata";
    			t13 = text(" - onde descobri minha paixão por programação - em especial pela web.");
    			t14 = space();
    			p3 = element("p");
    			t15 = text("Depois de anos na profissão, resolvi que meu conhecimento deveria ser repassado. Foi aí que comecei ");
    			a2 = element("a");
    			a2.textContent = "meus projetos Open Source";
    			t17 = text(", onde tanto crio projetos do zero quanto ajudo outras pessoas ou organizações a manter os seus projetos - seja com código, documentação ou respondendo issues.");
    			t18 = space();
    			section2 = element("section");
    			div4 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Projetos Open source";
    			t20 = space();
    			div5 = element("div");
    			p4 = element("p");
    			a3 = element("a");
    			a3.textContent = "ericmdantas/aliv";
    			t22 = text(" é um servidor HTTP e proxy reverso em ");
    			a4 = element("a");
    			a4.textContent = "Node";
    			t24 = text(". Criado em 2016 com o foco em ser um servidor simples de configurar, leve e rápido para rodar e atender algumas necessidades específicas. O projeto foi primordial para agilizar e organizar projetos que dependiam de configurações mais complexas. Desde configurações de certificado para servir estáticos em HTTP/2 até fazer proxies para servidores externos.");
    			t25 = space();
    			p5 = element("p");
    			a5 = element("a");
    			a5.textContent = "ericmdantas/generator-ng-fullstack";
    			t27 = text(" é um gerador de projetos web fullstack. São apresentadas algumas perguntas para o desenvolvedor e conforme as perguntas vão sendo respondidas, o projeto vai se auto configurando - já com toda a estrutura funcional, com conexões com banco e testes unitários prontos para rodar. Perguntas como: Qual linguagem será utilizada no backend? Prefere utilizar este webframework ou aquele? Utilizar a compilação pelo Babel ou Typescript? Entre outras. Foi criado em 2015 e ainda é utilizado por desenvolvedores no mundo todo.");
    			t28 = space();
    			p6 = element("p");
    			a6 = element("a");
    			a6.textContent = "ericmdantas/generator-angularjs-module";
    			t30 = text(" é um gerador de boilerplate para libs escritas em AngularJS. O projeto já configura todos os pontos de organização do fonte e testes - com integração com o ");
    			a7 = element("a");
    			a7.textContent = "TravisCI";
    			t32 = text(".");
    			t33 = space();
    			p7 = element("p");
    			a8 = element("a");
    			a8.textContent = "ericmdantas/generator-angularjs-module";
    			t35 = text(" é um gerador de boilerplate para libs Node. O projeto já configura todos os pontos de fonte e testes - com integração com o ");
    			a9 = element("a");
    			a9.textContent = "TravisCI";
    			t37 = text(".");
    			t38 = space();
    			p8 = element("p");
    			a10 = element("a");
    			a10.textContent = "ericmdantas/ng-xtorage";
    			t40 = space();
    			p9 = element("p");
    			a11 = element("a");
    			a11.textContent = "ericmdantas/xtorage";
    			t42 = space();
    			p10 = element("p");
    			a12 = element("a");
    			a12.textContent = "ericmdantas/μBus";
    			t44 = space();
    			p11 = element("p");
    			a13 = element("a");
    			a13.textContent = "ericmdantas/express-content-length-validator";
    			t46 = space();
    			p12 = element("p");
    			a14 = element("a");
    			a14.textContent = "ericmdantas/vue-floating-alert";
    			t48 = space();
    			p13 = element("p");
    			a15 = element("a");
    			a15.textContent = "ericmdantas/vue-simple-snackbar";
    			t50 = space();
    			p14 = element("p");
    			a16 = element("a");
    			a16.textContent = "ericmdantas/angular2-typescript-todo";
    			t52 = text(" era um boilerplate que foi utilizado como base de aprendizado por desenvolvedores que estavam começando a aprender Angular2. Foi criado quando a versão do Angular2 ainda estava em alpha e as mudanças eram quase que diárias. Este respositório dava aos desenvolvedores um lembrete das sintaxes e dependencias utilizadas para criar a aplicação e manter os testes rodando.");
    			t53 = space();
    			p15 = element("p");
    			a17 = element("a");
    			a17.textContent = "ericmdantas/goliv";
    			t55 = text(" também é um servidor HTTP e proxy reverso, a única diferença para o `aliv` é que este foi escrito em ");
    			a18 = element("a");
    			a18.textContent = "Go";
    			t57 = text(".");
    			t58 = space();
    			p16 = element("p");
    			a19 = element("a");
    			a19.textContent = "angular/angular";
    			t60 = space();
    			p17 = element("p");
    			a20 = element("a");
    			a20.textContent = "labstack/echo";
    			t62 = space();
    			p18 = element("p");
    			a21 = element("a");
    			a21.textContent = "rakyll/hey";
    			t64 = space();
    			p19 = element("p");
    			a22 = element("a");
    			a22.textContent = "radovskyb/watcher";
    			t66 = space();
    			p20 = element("p");
    			a23 = element("a");
    			a23.textContent = "VividCortex/angular-recaptcha";
    			t68 = space();
    			section3 = element("section");
    			div6 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Projetos diversos";
    			t70 = space();
    			div7 = element("div");
    			t71 = space();
    			section4 = element("section");
    			div8 = element("div");
    			h33 = element("h3");
    			h33.textContent = "Tecnologias";
    			t73 = space();
    			div9 = element("div");
    			t74 = space();
    			section5 = element("section");
    			div10 = element("div");
    			h34 = element("h3");
    			h34.textContent = "Lugares onde trabalhei";
    			t76 = space();
    			div11 = element("div");
    			t77 = space();
    			section6 = element("section");
    			small = element("small");
    			em = element("em");
    			em.textContent = "Última atualização em: 29/11/2021";
    			attr_dev(h2, "class", "my-name svelte-1wkdbm2");
    			add_location(h2, file, 20, 3, 399);
    			attr_dev(p0, "class", "my-email svelte-1wkdbm2");
    			add_location(p0, file, 21, 3, 446);
    			attr_dev(div0, "class", "about-me-contact svelte-1wkdbm2");
    			add_location(div0, file, 19, 2, 365);
    			attr_dev(div1, "class", "about-me-links svelte-1wkdbm2");
    			add_location(div1, file, 24, 2, 504);
    			attr_dev(section0, "class", "about-me-container svelte-1wkdbm2");
    			add_location(section0, file, 18, 1, 326);
    			attr_dev(h30, "class", "svelte-1wkdbm2");
    			add_location(h30, file, 33, 3, 757);
    			attr_dev(div2, "class", "section-header svelte-1wkdbm2");
    			add_location(div2, file, 32, 2, 725);
    			attr_dev(a0, "href", "http://www.unifeso.edu.br/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "svelte-1wkdbm2");
    			add_location(a0, file, 37, 84, 896);
    			add_location(p1, file, 37, 3, 815);
    			attr_dev(a1, "href", "https://alterdata.com.br");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "svelte-1wkdbm2");
    			add_location(a1, file, 38, 52, 1018);
    			add_location(p2, file, 38, 3, 969);
    			attr_dev(a2, "href", "https://github.com/ericmdantas");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "class", "svelte-1wkdbm2");
    			add_location(a2, file, 39, 106, 1262);
    			add_location(p3, file, 39, 3, 1159);
    			attr_dev(div3, "clas", "about-me-info");
    			add_location(div3, file, 36, 2, 785);
    			attr_dev(section1, "class", "profile-container svelte-1wkdbm2");
    			add_location(section1, file, 31, 1, 687);
    			attr_dev(h31, "class", "svelte-1wkdbm2");
    			add_location(h31, file, 45, 3, 1620);
    			attr_dev(div4, "class", "section-header svelte-1wkdbm2");
    			add_location(div4, file, 44, 2, 1588);
    			attr_dev(a3, "href", "https://github.com/ericmdantas/aliv");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "class", "svelte-1wkdbm2");
    			add_location(a3, file, 50, 4, 1703);
    			attr_dev(a4, "href", "https://nodejs.org/en/");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "class", "svelte-1wkdbm2");
    			add_location(a4, file, 50, 125, 1824);
    			add_location(p4, file, 49, 3, 1695);
    			attr_dev(a5, "href", "https://github.com/ericmdantas/generator-ng-fullstack");
    			attr_dev(a5, "target", "_blank");
    			attr_dev(a5, "class", "svelte-1wkdbm2");
    			add_location(a5, file, 54, 4, 2258);
    			add_location(p5, file, 53, 3, 2250);
    			attr_dev(a6, "href", "https://github.com/ericmdantas/generator-angularjs-module");
    			attr_dev(a6, "target", "_blank");
    			attr_dev(a6, "class", "svelte-1wkdbm2");
    			add_location(a6, file, 58, 4, 2914);
    			attr_dev(a7, "href", "http://travis-ci.org");
    			attr_dev(a7, "target", "_blank");
    			attr_dev(a7, "class", "svelte-1wkdbm2");
    			add_location(a7, file, 58, 287, 3197);
    			add_location(p6, file, 57, 3, 2906);
    			attr_dev(a8, "href", "https://github.com/ericmdantas/generator-nodejs-module");
    			attr_dev(a8, "target", "_blank");
    			attr_dev(a8, "class", "svelte-1wkdbm2");
    			add_location(a8, file, 62, 4, 3278);
    			attr_dev(a9, "href", "http://travis-ci.org");
    			attr_dev(a9, "target", "_blank");
    			attr_dev(a9, "class", "svelte-1wkdbm2");
    			add_location(a9, file, 62, 252, 3526);
    			add_location(p7, file, 61, 3, 3270);
    			attr_dev(a10, "href", "https://github.com/ericmdantas/ng-xtorage");
    			attr_dev(a10, "target", "_blank");
    			attr_dev(a10, "class", "svelte-1wkdbm2");
    			add_location(a10, file, 66, 4, 3607);
    			add_location(p8, file, 65, 3, 3599);
    			attr_dev(a11, "href", "https://github.com/ericmdantas/xtorage");
    			attr_dev(a11, "target", "_blank");
    			attr_dev(a11, "class", "svelte-1wkdbm2");
    			add_location(a11, file, 70, 4, 3722);
    			add_location(p9, file, 69, 3, 3714);
    			attr_dev(a12, "href", "https://github.com/ericmdantas/uBus");
    			attr_dev(a12, "target", "_blank");
    			attr_dev(a12, "class", "svelte-1wkdbm2");
    			add_location(a12, file, 74, 4, 3831);
    			add_location(p10, file, 73, 3, 3823);
    			attr_dev(a13, "href", "https://github.com/ericmdantas/express-content-length-validator");
    			attr_dev(a13, "target", "_blank");
    			attr_dev(a13, "class", "svelte-1wkdbm2");
    			add_location(a13, file, 78, 4, 3934);
    			add_location(p11, file, 77, 3, 3926);
    			attr_dev(a14, "href", "https://github.com/ericmdantas/vue-floating-alert");
    			attr_dev(a14, "target", "_blank");
    			attr_dev(a14, "class", "svelte-1wkdbm2");
    			add_location(a14, file, 82, 4, 4093);
    			add_location(p12, file, 81, 3, 4085);
    			attr_dev(a15, "href", "https://github.com/ericmdantas/vue-simple-snackbar");
    			attr_dev(a15, "target", "_blank");
    			attr_dev(a15, "class", "svelte-1wkdbm2");
    			add_location(a15, file, 86, 4, 4224);
    			add_location(p13, file, 85, 3, 4216);
    			attr_dev(a16, "href", "https://github.com/ericmdantas/angular2-typescript-todo");
    			attr_dev(a16, "target", "_blank");
    			attr_dev(a16, "class", "svelte-1wkdbm2");
    			add_location(a16, file, 90, 4, 4357);
    			add_location(p14, file, 89, 3, 4349);
    			attr_dev(a17, "href", "https://github.com/ericmdantas/goliv");
    			attr_dev(a17, "target", "_blank");
    			attr_dev(a17, "class", "svelte-1wkdbm2");
    			add_location(a17, file, 94, 4, 4869);
    			attr_dev(a18, "href", "https://golang.org/project/");
    			attr_dev(a18, "class", "svelte-1wkdbm2");
    			add_location(a18, file, 94, 190, 5055);
    			add_location(p15, file, 93, 3, 4861);
    			attr_dev(a19, "href", "https://github.com/angular/angular");
    			attr_dev(a19, "target", "_blank");
    			attr_dev(a19, "class", "svelte-1wkdbm2");
    			add_location(a19, file, 98, 4, 5121);
    			add_location(p16, file, 97, 3, 5113);
    			attr_dev(a20, "href", "https://github.com/labstack/echo");
    			attr_dev(a20, "target", "_blank");
    			attr_dev(a20, "class", "svelte-1wkdbm2");
    			add_location(a20, file, 102, 4, 5222);
    			add_location(p17, file, 101, 3, 5214);
    			attr_dev(a21, "href", "https://github.com/rakyll/hey");
    			attr_dev(a21, "target", "_blank");
    			attr_dev(a21, "class", "svelte-1wkdbm2");
    			add_location(a21, file, 106, 4, 5319);
    			add_location(p18, file, 105, 3, 5311);
    			attr_dev(a22, "href", "https://github.com/radovskyb/watcher");
    			attr_dev(a22, "target", "_blank");
    			attr_dev(a22, "class", "svelte-1wkdbm2");
    			add_location(a22, file, 110, 4, 5410);
    			add_location(p19, file, 109, 3, 5402);
    			attr_dev(a23, "href", "https://github.com/VividCortex/angular-recaptcha");
    			attr_dev(a23, "target", "_blank");
    			attr_dev(a23, "class", "svelte-1wkdbm2");
    			add_location(a23, file, 114, 4, 5515);
    			add_location(p20, file, 113, 3, 5507);
    			attr_dev(div5, "class", "section-content");
    			add_location(div5, file, 48, 2, 1662);
    			attr_dev(section2, "class", "projects-created-by-me-container svelte-1wkdbm2");
    			add_location(section2, file, 43, 1, 1535);
    			attr_dev(h32, "class", "svelte-1wkdbm2");
    			add_location(h32, file, 121, 3, 5739);
    			attr_dev(div6, "class", "section-header svelte-1wkdbm2");
    			add_location(div6, file, 120, 2, 5707);
    			attr_dev(div7, "class", "section-content");
    			add_location(div7, file, 124, 2, 5778);
    			attr_dev(section3, "class", "projects-i-worked-for-container svelte-1wkdbm2");
    			add_location(section3, file, 119, 1, 5655);
    			attr_dev(h33, "class", "svelte-1wkdbm2");
    			add_location(h33, file, 131, 3, 5914);
    			attr_dev(div8, "class", "section-header svelte-1wkdbm2");
    			add_location(div8, file, 130, 2, 5882);
    			attr_dev(div9, "class", "section-content");
    			add_location(div9, file, 134, 2, 5947);
    			attr_dev(section4, "class", "technologies-i-know-container svelte-1wkdbm2");
    			add_location(section4, file, 129, 1, 5832);
    			attr_dev(h34, "class", "svelte-1wkdbm2");
    			add_location(h34, file, 141, 3, 6079);
    			attr_dev(div10, "class", "section-header svelte-1wkdbm2");
    			add_location(div10, file, 140, 2, 6047);
    			attr_dev(div11, "class", "section-content");
    			add_location(div11, file, 144, 2, 6123);
    			attr_dev(section5, "class", "places-i-worked-container svelte-1wkdbm2");
    			add_location(section5, file, 139, 1, 6001);
    			add_location(em, file, 151, 3, 6234);
    			add_location(small, file, 150, 2, 6223);
    			attr_dev(section6, "class", "last-updated-at-container svelte-1wkdbm2");
    			add_location(section6, file, 149, 1, 6177);
    			attr_dev(div12, "class", "cv svelte-1wkdbm2");
    			add_location(div12, file, 17, 0, 308);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, section0);
    			append_dev(section0, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(section0, t3);
    			append_dev(section0, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div12, t4);
    			append_dev(div12, section1);
    			append_dev(section1, div2);
    			append_dev(div2, h30);
    			append_dev(section1, t6);
    			append_dev(section1, div3);
    			append_dev(div3, p1);
    			append_dev(p1, t7);
    			append_dev(p1, a0);
    			append_dev(p1, t9);
    			append_dev(div3, t10);
    			append_dev(div3, p2);
    			append_dev(p2, t11);
    			append_dev(p2, a1);
    			append_dev(p2, t13);
    			append_dev(div3, t14);
    			append_dev(div3, p3);
    			append_dev(p3, t15);
    			append_dev(p3, a2);
    			append_dev(p3, t17);
    			append_dev(div12, t18);
    			append_dev(div12, section2);
    			append_dev(section2, div4);
    			append_dev(div4, h31);
    			append_dev(section2, t20);
    			append_dev(section2, div5);
    			append_dev(div5, p4);
    			append_dev(p4, a3);
    			append_dev(p4, t22);
    			append_dev(p4, a4);
    			append_dev(p4, t24);
    			append_dev(div5, t25);
    			append_dev(div5, p5);
    			append_dev(p5, a5);
    			append_dev(p5, t27);
    			append_dev(div5, t28);
    			append_dev(div5, p6);
    			append_dev(p6, a6);
    			append_dev(p6, t30);
    			append_dev(p6, a7);
    			append_dev(p6, t32);
    			append_dev(div5, t33);
    			append_dev(div5, p7);
    			append_dev(p7, a8);
    			append_dev(p7, t35);
    			append_dev(p7, a9);
    			append_dev(p7, t37);
    			append_dev(div5, t38);
    			append_dev(div5, p8);
    			append_dev(p8, a10);
    			append_dev(div5, t40);
    			append_dev(div5, p9);
    			append_dev(p9, a11);
    			append_dev(div5, t42);
    			append_dev(div5, p10);
    			append_dev(p10, a12);
    			append_dev(div5, t44);
    			append_dev(div5, p11);
    			append_dev(p11, a13);
    			append_dev(div5, t46);
    			append_dev(div5, p12);
    			append_dev(p12, a14);
    			append_dev(div5, t48);
    			append_dev(div5, p13);
    			append_dev(p13, a15);
    			append_dev(div5, t50);
    			append_dev(div5, p14);
    			append_dev(p14, a16);
    			append_dev(p14, t52);
    			append_dev(div5, t53);
    			append_dev(div5, p15);
    			append_dev(p15, a17);
    			append_dev(p15, t55);
    			append_dev(p15, a18);
    			append_dev(p15, t57);
    			append_dev(div5, t58);
    			append_dev(div5, p16);
    			append_dev(p16, a19);
    			append_dev(div5, t60);
    			append_dev(div5, p17);
    			append_dev(p17, a20);
    			append_dev(div5, t62);
    			append_dev(div5, p18);
    			append_dev(p18, a21);
    			append_dev(div5, t64);
    			append_dev(div5, p19);
    			append_dev(p19, a22);
    			append_dev(div5, t66);
    			append_dev(div5, p20);
    			append_dev(p20, a23);
    			append_dev(div12, t68);
    			append_dev(div12, section3);
    			append_dev(section3, div6);
    			append_dev(div6, h32);
    			append_dev(section3, t70);
    			append_dev(section3, div7);
    			append_dev(div12, t71);
    			append_dev(div12, section4);
    			append_dev(section4, div8);
    			append_dev(div8, h33);
    			append_dev(section4, t73);
    			append_dev(section4, div9);
    			append_dev(div12, t74);
    			append_dev(div12, section5);
    			append_dev(section5, div10);
    			append_dev(div10, h34);
    			append_dev(section5, t76);
    			append_dev(section5, div11);
    			append_dev(div12, t77);
    			append_dev(div12, section6);
    			append_dev(section6, small);
    			append_dev(small, em);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*myContactLinks*/ 1) {
    				each_value = /*myContactLinks*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	const myContactLinks = [
    		{
    			url: 'https://github.com/ericmdantas',
    			description: 'Github'
    		},
    		{
    			url: 'https://www.linkedin.com/in/eric-dantas-8833a1167/',
    			description: 'LinkedIn'
    		},
    		{
    			url: 'https://instagram.com/ericdantas0',
    			description: 'Instagram'
    		}
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ myContactLinks });
    	return [myContactLinks];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
