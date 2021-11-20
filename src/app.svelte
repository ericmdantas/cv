<script>
	const myContactLinks = [
		{
			url: 'https://github.com/ericmdantas',
			description: 'Github',
		},
		{
			url: 'https://www.linkedin.com/in/eric-dantas-8833a1167/',
			description: 'LinkedIn',
		},
		{
			url: 'https://instagram.com/ericdantas0',
			description: 'Instagram',
		},
	]
</script>

<div class="cv">
	<section class="about-me-container">
		<div class="about-me-contact">
			<h2 class="my-name">Eric Mendes Dantas</h2>
			<p class="my-email">ericdantas0@gmail.com</p>
		</div>

		<div class="about-me-links">
			{#each myContactLinks as link}
				<a class="contact-links" href="{link.url}" target="_blank">{link.description}</a>
			{/each}
		</div>
	</section>

	<section class="profile-container">
		<div class="section-header">
			<h3>Perfil</h3>
		</div>

		<div clas="about-me-info">
			<p>Nascido e criado em Teresópolis/RJ, sou formado em Ciência da Computação pela <a href="http://www.unifeso.edu.br/" target="_blank">Unifeso</a>.</p>
			<p>Após terminar a faculdade fui contratado pela <a href="https://alterdata.com.br" target="_blank">Alterdata</a> - onde descobri minha paixão por programação - em especial pela web.</p>
			<p>Depois de anos na profissão, resolvi que meu conhecimento deveria ser repassado. Foi aí que comecei <a href="https://github.com/ericmdantas" target="_blank">meus projetos Open Source</a>, onde tanto crio projetos do zero quanto ajudo outras pessoas ou organizações a manter os seus projetos - seja com código, documentação ou respondendo issues.</p>
		</div>
	</section>

	<section class="projects-created-by-me-container">
		<div class="section-header">
			<h3>Projetos Open source</h3>
		</div>

		<div class="section-content">
			<p>
				<a href="https://github.com/ericmdantas/aliv" target="_blank">ericmdantas/aliv</a> é um servidor HTTP e proxy reverso em <a href="https://nodejs.org/en/" target="_blank">Node</a>. Criado em 2016 com o foco em ser um servidor simples de configurar, leve e rápido para rodar e atender algumas necessidades específicas. O projeto foi primordial para agilizar e organizar projetos que dependiam de configurações mais complexas. Desde configurações de certificado para servir estáticos em HTTP/2 até fazer proxies para servidores externos.
			</p>

			<p>
				<a href="https://github.com/ericmdantas/generator-ng-fullstack" target="_blank">ericmdantas/generator-ng-fullstack</a> é um gerador de projetos web fullstack. São apresentadas algumas perguntas para o desenvolvedor e conforme as perguntas vão sendo respondidas, o projeto vai se auto configurando - já com toda a estrutura funcional, com conexões com banco e testes unitários prontos para rodar. Perguntas como: Qual linguagem será utilizada no backend? Prefere utilizar este webframework ou aquele? Utilizar a compilação pelo Babel ou Typescript? Entre outras. Foi criado em 2015 e ainda é utilizado por desenvolvedores no mundo todo.
			</p>

			<p>
				<a href="https://github.com/ericmdantas/generator-angularjs-module" target="_blank">ericmdantas/generator-angularjs-module</a> é um gerador de boilerplate para libs escritas em AngularJS. O projeto já configura todos os pontos de organização do fonte e testes - com integração com o <a href="http://travis-ci.org" target="_blank">TravisCI</a>.
			</p>

			<p>
				<a href="https://github.com/ericmdantas/generator-nodejs-module" target="_blank">ericmdantas/generator-angularjs-module</a> é um gerador de boilerplate para libs Node. O projeto já configura todos os pontos de fonte e testes - com integração com o <a href="http://travis-ci.org" target="_blank">TravisCI</a>.
			</p>

			<p>
				<a href="https://github.com/ericmdantas/ng-xtorage" target="_blank">ericmdantas/ng-xtorage</a>
			</p>

			<p>
				<a href="https://github.com/ericmdantas/xtorage" target="_blank">ericmdantas/xtorage</a>
			</p>

			<p>
				<a href="https://github.com/ericmdantas/uBus" target="_blank">ericmdantas/μBus</a>
			</p>

			<p>
				<a href="https://github.com/ericmdantas/express-content-length-validator" target="_blank">ericmdantas/express-content-length-validator</a>
			</p>

			<p>
				<a href="https://github.com/ericmdantas/vue-floating-alert" target="_blank">ericmdantas/vue-floating-alert</a>
			</p>

			<p>
				<a href="https://github.com/ericmdantas/vue-simple-snackbar" target="_blank">ericmdantas/vue-simple-snackbar</a>
			</p>

			<p>
				<a href="https://github.com/ericmdantas/angular2-typescript-todo" target="_blank">ericmdantas/angular2-typescript-todo</a> era um boilerplate que foi utilizado como base de aprendizado por desenvolvedores que estavam começando a aprender Angular2. Foi criado quando a versão do Angular2 ainda estava em alpha e as mudanças eram quase que diárias. Este respositório dava aos desenvolvedores um lembrete das sintaxes e dependencias utilizadas para criar a aplicação e manter os testes rodando.
			</p>

			<p>
				<a href="https://github.com/ericmdantas/goliv" target="_blank">ericmdantas/goliv</a> também é um servidor HTTP e proxy reverso, a única diferença para o `aliv` é que este foi escrito em <a href="https://golang.org/project/">Go</a>.
			</p>

			<p>
				<a href="https://github.com/angular/angular" target="_blank">angular/angular</a>
			</p>

			<p>
				<a href="https://github.com/labstack/echo" target="_blank">labstack/echo</a>
			</p>

			<p>
				<a href="https://github.com/rakyll/hey" target="_blank">rakyll/hey</a>
			</p>

			<p>
				<a href="https://github.com/radovskyb/watcher" target="_blank">radovskyb/watcher</a>
			</p>

			<p>
				<a href="https://github.com/VividCortex/angular-recaptcha" target="_blank">VividCortex/angular-recaptcha</a>
			</p>
		</div>
	</section>

	<section class="projects-i-worked-for-container">
		<div class="section-header">
			<h3>Projetos diversos</h3>
		</div>

		<div class="section-content">

		</div>
	</section>

	<section class="technologies-i-know-container">
		<div class="section-header">
			<h3>Tecnologias</h3>
		</div>

		<div class="section-content">

		</div>
	</section>

	<section class="places-i-worked-container">
		<div class="section-header">
			<h3>Lugares onde trabalhei</h3>
		</div>

		<div class="section-content">

		</div>
	</section>

	<section class="last-updated-at-container">
		<small>
			<em>Última atualização em: 29/11/2021</em>
		</small>
	</section>
</div>

<style>
.cv section {
	margin-bottom: 32px;
}

.cv .about-me-container .about-me-contact .my-name {
	text-transform: uppercase;
	margin-top: 0px;
	margin-bottom: 16px;
}

.cv .about-me-container .about-me-contact .my-email {
	font-family: monospace;
}

.cv .about-me-container .about-me-links a {
	margin-top: 16px;
	margin-right: 8px;
	border-bottom: none;
}

.cv .about-me-container .about-me-links a:not(:last-of-type)::after {
	content: '•';
	color: #333;
	margin-left: 8px;
}

.cv .section-header {
	position: relative;
	text-transform: uppercase;
	letter-spacing: 1px;
}

.cv .section-header h3::after {
	content: '';
	position: absolute;
	left: 0;
	bottom: -6px;
	height: 3px;
	width: 35px;
	background-color: #f44f2e;
}

.cv .last-updated-at-container {
	margin-top: 48px;
	margin-bottom: 16px;
	text-align: right;
	color: #777;
}

a {
	text-decoration: none;
	color: #0F5AF2;
	border-bottom: none;
}

a:visited {
	color: #0F5AF2;
	border-bottom-color: #0F5AF2;
}

@media(min-width: 768px) {
	.cv .about-me-container .about-me-contact {
		text-align: center;
	}
	.cv .about-me-container .about-me-links {
		text-align: center;
	}
}
</style>