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

    function create_fragment(ctx) {
    	let div7;
    	let div3;
    	let div0;
    	let h2;
    	let t1;
    	let p0;
    	let t3;
    	let div1;
    	let a0;
    	let t5;
    	let a1;
    	let t7;
    	let a2;
    	let t9;
    	let a3;
    	let t11;
    	let div2;
    	let h30;
    	let t13;
    	let p1;
    	let t14;
    	let a4;
    	let t16;
    	let t17;
    	let p2;
    	let t18;
    	let a5;
    	let t20;
    	let t21;
    	let p3;
    	let t22;
    	let a6;
    	let t24;
    	let t25;
    	let div4;
    	let h31;
    	let t27;
    	let p4;
    	let a7;
    	let t29;
    	let a8;
    	let t31;
    	let t32;
    	let p5;
    	let a9;
    	let t34;
    	let t35;
    	let p6;
    	let a10;
    	let t37;
    	let a11;
    	let t39;
    	let t40;
    	let p7;
    	let a12;
    	let t42;
    	let a13;
    	let t44;
    	let t45;
    	let p8;
    	let a14;
    	let t47;
    	let p9;
    	let a15;
    	let t49;
    	let p10;
    	let a16;
    	let t51;
    	let p11;
    	let a17;
    	let t53;
    	let p12;
    	let a18;
    	let t55;
    	let p13;
    	let a19;
    	let t57;
    	let p14;
    	let a20;
    	let t59;
    	let t60;
    	let p15;
    	let a21;
    	let t62;
    	let a22;
    	let t64;
    	let t65;
    	let p16;
    	let a23;
    	let t67;
    	let p17;
    	let a24;
    	let t69;
    	let p18;
    	let a25;
    	let t71;
    	let p19;
    	let a26;
    	let t73;
    	let p20;
    	let a27;
    	let t75;
    	let div5;
    	let h32;
    	let t77;
    	let div6;
    	let p21;
    	let em;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div3 = element("div");
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
    			t5 = text("\n\t\t\t•\n\t\t\t");
    			a1 = element("a");
    			a1.textContent = "LinkedIn";
    			t7 = text("\n\t\t\t•\n\t\t\t");
    			a2 = element("a");
    			a2.textContent = "Instagram";
    			t9 = text("\n\t\t\t•\n\t\t\t");
    			a3 = element("a");
    			a3.textContent = "Facebook";
    			t11 = space();
    			div2 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Perfil";
    			t13 = space();
    			p1 = element("p");
    			t14 = text("Nascido e criado em Teresópolis/RJ, sou formado em Ciência da Computação pela ");
    			a4 = element("a");
    			a4.textContent = "Unifeso";
    			t16 = text(".");
    			t17 = space();
    			p2 = element("p");
    			t18 = text("Após terminar a faculdade fui contratado pela ");
    			a5 = element("a");
    			a5.textContent = "Alterdata";
    			t20 = text(" - onde descobri minha paixão por programação - em especial pela web.");
    			t21 = space();
    			p3 = element("p");
    			t22 = text("Depois de anos na profissão, resolvi que meu conhecimento deveria ser repassado. Foi aí que comecei ");
    			a6 = element("a");
    			a6.textContent = "meus projetos Open Source";
    			t24 = text(", onde tanto crio projetos do zero quanto ajudo outras pessoas ou organizações a manter os seus projetos - seja com código, documentação ou respondendo issues.");
    			t25 = space();
    			div4 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Open source";
    			t27 = space();
    			p4 = element("p");
    			a7 = element("a");
    			a7.textContent = "ericmdantas/aliv";
    			t29 = text(" é um servidor HTTP e proxy reverso em ");
    			a8 = element("a");
    			a8.textContent = "Node";
    			t31 = text(". Criado em 2016 com o foco em ser um servidor simples de configurar, leve e rápido para rodar e atender algumas necessidades específicas. O projeto foi primordial para agilizar e organizar projetos que dependiam de configurações mais complexas. Desde configurações de certificado para servir estáticos em HTTP/2 até fazer proxies para servidores externos.");
    			t32 = space();
    			p5 = element("p");
    			a9 = element("a");
    			a9.textContent = "ericmdantas/generator-ng-fullstack";
    			t34 = text(" é um gerador de projetos web fullstack. São apresentadas algumas perguntas para o desenvolvedor e conforme as perguntas vão sendo respondidas, o projeto vai se auto configurando - já com toda a estrutura funcional, com conexões com banco e testes unitários prontos para rodar. Perguntas como: Qual linguagem será utilizada no backend? Prefere utilizar este webframework ou aquele? Utilizar a compilação pelo Babel ou Typescript? Entre outras. Foi criado em 2015 e ainda é utilizado por desenvolvedores no mundo todo.");
    			t35 = space();
    			p6 = element("p");
    			a10 = element("a");
    			a10.textContent = "ericmdantas/generator-angularjs-module";
    			t37 = text(" é um gerador de boilerplate para libs escritas em AngularJS. O projeto já configura todos os pontos de organização do fonte e testes - com integração com o ");
    			a11 = element("a");
    			a11.textContent = "TravisCI";
    			t39 = text(".");
    			t40 = space();
    			p7 = element("p");
    			a12 = element("a");
    			a12.textContent = "ericmdantas/generator-angularjs-module";
    			t42 = text(" é um gerador de boilerplate para libs Node. O projeto já configura todos os pontos de fonte e testes - com integração com o ");
    			a13 = element("a");
    			a13.textContent = "TravisCI";
    			t44 = text(".");
    			t45 = space();
    			p8 = element("p");
    			a14 = element("a");
    			a14.textContent = "ericmdantas/ng-xtorage";
    			t47 = space();
    			p9 = element("p");
    			a15 = element("a");
    			a15.textContent = "ericmdantas/xtorage";
    			t49 = space();
    			p10 = element("p");
    			a16 = element("a");
    			a16.textContent = "ericmdantas/μBus";
    			t51 = space();
    			p11 = element("p");
    			a17 = element("a");
    			a17.textContent = "ericmdantas/express-content-length-validator";
    			t53 = space();
    			p12 = element("p");
    			a18 = element("a");
    			a18.textContent = "ericmdantas/vue-floating-alert";
    			t55 = space();
    			p13 = element("p");
    			a19 = element("a");
    			a19.textContent = "ericmdantas/vue-simple-snackbar";
    			t57 = space();
    			p14 = element("p");
    			a20 = element("a");
    			a20.textContent = "ericmdantas/angular2-typescript-todo";
    			t59 = text(" era um boilerplate que foi utilizado como base de aprendizado por desenvolvedores que estavam começando a aprender Angular2. Foi criado quando a versão do Angular2 ainda estava em alpha e as mudanças eram quase que diárias. Este respositório dava aos desenvolvedores um lembrete das sintaxes e dependencias utilizadas para criar a aplicação e manter os testes rodando.");
    			t60 = space();
    			p15 = element("p");
    			a21 = element("a");
    			a21.textContent = "ericmdantas/goliv";
    			t62 = text(" também é um servidor HTTP e proxy reverso, a única diferença para o `aliv` é que este foi escrito em ");
    			a22 = element("a");
    			a22.textContent = "Go";
    			t64 = text(".");
    			t65 = space();
    			p16 = element("p");
    			a23 = element("a");
    			a23.textContent = "angular/angular";
    			t67 = space();
    			p17 = element("p");
    			a24 = element("a");
    			a24.textContent = "labstack/echo";
    			t69 = space();
    			p18 = element("p");
    			a25 = element("a");
    			a25.textContent = "rakyll/hey";
    			t71 = space();
    			p19 = element("p");
    			a26 = element("a");
    			a26.textContent = "radovskyb/watcher";
    			t73 = space();
    			p20 = element("p");
    			a27 = element("a");
    			a27.textContent = "VividCortex/angular-recaptcha";
    			t75 = space();
    			div5 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Projetos diversos";
    			t77 = space();
    			div6 = element("div");
    			p21 = element("p");
    			em = element("em");
    			em.textContent = "Última atualização em: 30/04/2019";
    			attr_dev(h2, "class", "my-name");
    			add_location(h2, file, 7, 3, 109);
    			attr_dev(p0, "class", "my-email");
    			add_location(p0, file, 8, 3, 156);
    			attr_dev(div0, "class", "about-me-contact");
    			add_location(div0, file, 6, 2, 75);
    			attr_dev(a0, "href", "https://github.com/ericmdantas");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file, 12, 3, 246);
    			attr_dev(a1, "href", "https://www.linkedin.com/in/eric-dantas-8833a1167/");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file, 14, 3, 322);
    			attr_dev(a2, "href", "https://instagram.com/ericdantas0");
    			attr_dev(a2, "target", "_blank");
    			add_location(a2, file, 16, 3, 420);
    			attr_dev(a3, "href", "https://facebook.com/ericmdantas");
    			attr_dev(a3, "target", "_blank");
    			add_location(a3, file, 18, 3, 502);
    			attr_dev(div1, "class", "about-me-links");
    			add_location(div1, file, 11, 2, 214);
    			add_location(h30, file, 22, 3, 616);
    			attr_dev(a4, "href", "http://www.unifeso.edu.br/");
    			attr_dev(a4, "target", "_blank");
    			add_location(a4, file, 23, 84, 716);
    			add_location(p1, file, 23, 3, 635);
    			attr_dev(a5, "href", "https://alterdata.com.br");
    			attr_dev(a5, "target", "_blank");
    			add_location(a5, file, 24, 52, 838);
    			add_location(p2, file, 24, 3, 789);
    			attr_dev(a6, "href", "https://github.com/ericmdantas");
    			attr_dev(a6, "target", "_blank");
    			add_location(a6, file, 25, 106, 1082);
    			add_location(p3, file, 25, 3, 979);
    			attr_dev(div2, "clas", "about-me-info");
    			add_location(div2, file, 21, 2, 586);
    			attr_dev(div3, "class", "about-me-container");
    			add_location(div3, file, 5, 1, 40);
    			add_location(h31, file, 30, 2, 1400);
    			attr_dev(a7, "href", "https://github.com/ericmdantas/aliv");
    			attr_dev(a7, "target", "_blank");
    			add_location(a7, file, 33, 3, 1431);
    			attr_dev(a8, "href", "https://nodejs.org/en/");
    			attr_dev(a8, "target", "_blank");
    			add_location(a8, file, 33, 124, 1552);
    			add_location(p4, file, 32, 2, 1424);
    			attr_dev(a9, "href", "https://github.com/ericmdantas/generator-ng-fullstack");
    			attr_dev(a9, "target", "_blank");
    			add_location(a9, file, 37, 3, 1983);
    			add_location(p5, file, 36, 2, 1976);
    			attr_dev(a10, "href", "https://github.com/ericmdantas/generator-angularjs-module");
    			attr_dev(a10, "target", "_blank");
    			add_location(a10, file, 41, 3, 2636);
    			attr_dev(a11, "href", "http://travis-ci.org");
    			attr_dev(a11, "target", "_blank");
    			add_location(a11, file, 41, 286, 2919);
    			add_location(p6, file, 40, 2, 2629);
    			attr_dev(a12, "href", "https://github.com/ericmdantas/generator-nodejs-module");
    			attr_dev(a12, "target", "_blank");
    			add_location(a12, file, 45, 3, 2997);
    			attr_dev(a13, "href", "http://travis-ci.org");
    			attr_dev(a13, "target", "_blank");
    			add_location(a13, file, 45, 251, 3245);
    			add_location(p7, file, 44, 2, 2990);
    			attr_dev(a14, "href", "https://github.com/ericmdantas/ng-xtorage");
    			attr_dev(a14, "target", "_blank");
    			add_location(a14, file, 49, 3, 3323);
    			add_location(p8, file, 48, 2, 3316);
    			attr_dev(a15, "href", "https://github.com/ericmdantas/xtorage");
    			attr_dev(a15, "target", "_blank");
    			add_location(a15, file, 53, 3, 3435);
    			add_location(p9, file, 52, 2, 3428);
    			attr_dev(a16, "href", "https://github.com/ericmdantas/uBus");
    			attr_dev(a16, "target", "_blank");
    			add_location(a16, file, 57, 3, 3541);
    			add_location(p10, file, 56, 2, 3534);
    			attr_dev(a17, "href", "https://github.com/ericmdantas/express-content-length-validator");
    			attr_dev(a17, "target", "_blank");
    			add_location(a17, file, 61, 3, 3641);
    			add_location(p11, file, 60, 2, 3634);
    			attr_dev(a18, "href", "https://github.com/ericmdantas/vue-floating-alert");
    			attr_dev(a18, "target", "_blank");
    			add_location(a18, file, 65, 3, 3797);
    			add_location(p12, file, 64, 2, 3790);
    			attr_dev(a19, "href", "https://github.com/ericmdantas/vue-simple-snackbar");
    			attr_dev(a19, "target", "_blank");
    			add_location(a19, file, 69, 3, 3925);
    			add_location(p13, file, 68, 2, 3918);
    			attr_dev(a20, "href", "https://github.com/ericmdantas/angular2-typescript-todo");
    			attr_dev(a20, "target", "_blank");
    			add_location(a20, file, 73, 3, 4055);
    			add_location(p14, file, 72, 2, 4048);
    			attr_dev(a21, "href", "https://github.com/ericmdantas/goliv");
    			attr_dev(a21, "target", "_blank");
    			add_location(a21, file, 77, 3, 4564);
    			attr_dev(a22, "href", "https://golang.org/project/");
    			add_location(a22, file, 77, 189, 4750);
    			add_location(p15, file, 76, 2, 4557);
    			attr_dev(a23, "href", "https://github.com/angular/angular");
    			attr_dev(a23, "target", "_blank");
    			add_location(a23, file, 81, 3, 4813);
    			add_location(p16, file, 80, 2, 4806);
    			attr_dev(a24, "href", "https://github.com/labstack/echo");
    			attr_dev(a24, "target", "_blank");
    			add_location(a24, file, 85, 3, 4911);
    			add_location(p17, file, 84, 2, 4904);
    			attr_dev(a25, "href", "https://github.com/rakyll/hey");
    			attr_dev(a25, "target", "_blank");
    			add_location(a25, file, 89, 3, 5005);
    			add_location(p18, file, 88, 2, 4998);
    			attr_dev(a26, "href", "https://github.com/radovskyb/watcher");
    			attr_dev(a26, "target", "_blank");
    			add_location(a26, file, 93, 3, 5093);
    			add_location(p19, file, 92, 2, 5086);
    			attr_dev(a27, "href", "https://github.com/VividCortex/angular-recaptcha");
    			attr_dev(a27, "target", "_blank");
    			add_location(a27, file, 97, 3, 5195);
    			add_location(p20, file, 96, 2, 5188);
    			attr_dev(div4, "class", "projects-created-by-me-container");
    			add_location(div4, file, 29, 1, 1351);
    			add_location(h32, file, 102, 2, 5359);
    			attr_dev(div5, "class", "projects-i-worked-for");
    			add_location(div5, file, 101, 1, 5321);
    			add_location(em, file, 106, 5, 5407);
    			add_location(p21, file, 106, 2, 5404);
    			add_location(div6, file, 105, 1, 5396);
    			attr_dev(div7, "class", "cv");
    			add_location(div7, file, 4, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, a0);
    			append_dev(div1, t5);
    			append_dev(div1, a1);
    			append_dev(div1, t7);
    			append_dev(div1, a2);
    			append_dev(div1, t9);
    			append_dev(div1, a3);
    			append_dev(div3, t11);
    			append_dev(div3, div2);
    			append_dev(div2, h30);
    			append_dev(div2, t13);
    			append_dev(div2, p1);
    			append_dev(p1, t14);
    			append_dev(p1, a4);
    			append_dev(p1, t16);
    			append_dev(div2, t17);
    			append_dev(div2, p2);
    			append_dev(p2, t18);
    			append_dev(p2, a5);
    			append_dev(p2, t20);
    			append_dev(div2, t21);
    			append_dev(div2, p3);
    			append_dev(p3, t22);
    			append_dev(p3, a6);
    			append_dev(p3, t24);
    			append_dev(div7, t25);
    			append_dev(div7, div4);
    			append_dev(div4, h31);
    			append_dev(div4, t27);
    			append_dev(div4, p4);
    			append_dev(p4, a7);
    			append_dev(p4, t29);
    			append_dev(p4, a8);
    			append_dev(p4, t31);
    			append_dev(div4, t32);
    			append_dev(div4, p5);
    			append_dev(p5, a9);
    			append_dev(p5, t34);
    			append_dev(div4, t35);
    			append_dev(div4, p6);
    			append_dev(p6, a10);
    			append_dev(p6, t37);
    			append_dev(p6, a11);
    			append_dev(p6, t39);
    			append_dev(div4, t40);
    			append_dev(div4, p7);
    			append_dev(p7, a12);
    			append_dev(p7, t42);
    			append_dev(p7, a13);
    			append_dev(p7, t44);
    			append_dev(div4, t45);
    			append_dev(div4, p8);
    			append_dev(p8, a14);
    			append_dev(div4, t47);
    			append_dev(div4, p9);
    			append_dev(p9, a15);
    			append_dev(div4, t49);
    			append_dev(div4, p10);
    			append_dev(p10, a16);
    			append_dev(div4, t51);
    			append_dev(div4, p11);
    			append_dev(p11, a17);
    			append_dev(div4, t53);
    			append_dev(div4, p12);
    			append_dev(p12, a18);
    			append_dev(div4, t55);
    			append_dev(div4, p13);
    			append_dev(p13, a19);
    			append_dev(div4, t57);
    			append_dev(div4, p14);
    			append_dev(p14, a20);
    			append_dev(p14, t59);
    			append_dev(div4, t60);
    			append_dev(div4, p15);
    			append_dev(p15, a21);
    			append_dev(p15, t62);
    			append_dev(p15, a22);
    			append_dev(p15, t64);
    			append_dev(div4, t65);
    			append_dev(div4, p16);
    			append_dev(p16, a23);
    			append_dev(div4, t67);
    			append_dev(div4, p17);
    			append_dev(p17, a24);
    			append_dev(div4, t69);
    			append_dev(div4, p18);
    			append_dev(p18, a25);
    			append_dev(div4, t71);
    			append_dev(div4, p19);
    			append_dev(p19, a26);
    			append_dev(div4, t73);
    			append_dev(div4, p20);
    			append_dev(p20, a27);
    			append_dev(div7, t75);
    			append_dev(div7, div5);
    			append_dev(div5, h32);
    			append_dev(div7, t77);
    			append_dev(div7, div6);
    			append_dev(div6, p21);
    			append_dev(p21, em);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
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

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	return [];
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

}());
//# sourceMappingURL=bundle.js.map
