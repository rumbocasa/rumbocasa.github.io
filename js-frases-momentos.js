/* Rumbo · Frases de los momentos nuevos y refuerzos del banco. SOLO DATOS: extiende FRASES (frases.js), no lo reemplaza.
   Momentos nuevos: diaSinGasto, mesPasado (presupuesto superado), vuelta (regreso tras ausencia) y logro (logro desbloqueado).
   Voz: Coral femenina, tierna y coqueta; Oreo masculino, sereno y de humor seco. Tratan de «papás» a Vale y David.
   Regla de oro: el humor acompaña, nunca juzga ni se burla de nadie. Cada frase mezcla chiste, enseñanza y aliento. */
(function () {
'use strict';
const F = FRASES;

/* Tipos nuevos (icon usa los símbolos de index.html) */
Object.assign(F.tipos, {
  diaSinGasto: {k: 'diaSinGasto', chip: 'Día sin gastos',        tono: 'alegre', icon: 'leaf',   dog: 'orio',  cta: 'Ver gastos',      libre: true},
  mesPasado:   {k: 'mesPasado',   chip: 'Presupuesto superado',  tono: 'calma',  icon: 'wallet', dog: 'orio',  cta: 'Ver presupuesto'},
  vuelta:      {k: 'vuelta',      chip: 'Bienvenidos de vuelta', tono: 'calma',  icon: 'home',   dog: 'coral', cta: 'Ver inicio',      libre: true},
  logro:       {k: 'logro',       chip: 'Logro desbloqueado',    tono: 'alegre', icon: 'trophy', dog: 'coral', cta: 'Ver logros',      libre: true}
});

const nuevos = {
 diaSinGasto: {
  coral: [
   "Ayer no gastaron ni un peso. Mor, qué billetera tan descansada. Les cuelgo medalla en la pared.",
   "Día sin gastos: ayer no se murió ningún billete. Ave maría, eso merece misa de acción de gracias.",
   "Cero gastos ayer. Eso no es ser chichipatos, mis amores: es darle un abrazo al fin de mes.",
   "Los mejores planes casi siempre son gratis: una caminada, un tinto en casa, mirarse un rato.",
   "Un día sin gastos es como un día sin pulgas: se nota y se agradece.",
   "Ayer la plata no salió a pasear: se quedó en casa viendo novela. Qué juiciosa.",
   "Ahorrar un día no cambia el mes, pero sí el hábito. Y el hábito sí cambia el año.",
   "Ayer no dieron papaya, mis papás. El datáfono se quedó con las ganas, qué pecao.",
   "Día sin gastos y sobró cariño. Lo más rico de la vida no pasa por caja, jiji.",
   "Con razón amanecí contenta: ayer la billetera durmió completa y sin sobresaltos.",
   "Gastar poquito también es un arte, y ustedes están pintando bonito.",
   "Ayer ningún billete nos dejó huérfanos. Qué casa tan llena, mor."],
  orio: [
   "Ayer, cero gastos. La billetera durmió como yo: profundo y sin remordimientos.",
   "Día sin gastos. Lo barato sale caro; lo gratis sale perfecto.",
   "No gastaron nada. El banco no sabe qué pensar. Yo lo disfruto en silencio.",
   "Plata que no sale, plata que se queda a saludar al mes siguiente.",
   "Ayer no hubo difuntos en la billetera. La funeraria cerró temprano. Buen día.",
   "Cero gastos. Eso no es ser amarrado, papis: es ser estratégico con buen gusto.",
   "Menos compras, más sofá. Es la fórmula de la felicidad barata. La estoy patentando.",
   "Ayer la plata se salvó. Hoy no garantizo nada, pero ayer se salvó.",
   "Un día sin gastar no es costumbre todavía, pero por algo se empieza. Hasta la riqueza.",
   "Veinticuatro horas sin bajas. El billete más viejo de la casa les manda agradecimientos.",
   "No los obligo: solo sugiero repetirlo cuando se pueda. A la plata le sentó bien el reposo.",
   "Gastar con cabeza un día enseña a gastar con cabeza el mes. Poquito a poquito se llega."]
 },
 mesPasado: {
  coral: [
   "Mor, este mes el presupuesto quedó corto. No es drama: es información para el otro. ¡Aquí estoy!",
   "Se pasaron un poquito. Pasa hasta en las mejores casas. Lo importante es mirarlo juntos.",
   "El presupuesto llora bajito. Abrácenlo con un ajuste chiquito y se le pasa, mis amores.",
   "Nadie nace sabiendo cuadrar el mes. Yo no sé cuadrar ni mi cola. Juntos aprendemos, mor.",
   "Lo vieron a tiempo, y ver a tiempo es medio camino. El otro medio lo caminamos juntos.",
   "Cuando el mes se pasa no se pelea: se conversa. Yo medio, que tengo las orejas grandes.",
   "Toca apretarse el cinturón un huequito. Si quieren les presto mi collar, que me sobra.",
   "Ave maría, al mes se le fue la mano. Qué pecao, pero de eso nadie se muere: se ajusta y listo.",
   "La plata se nos fue antes de tiempo este mes. Duelo cortico y a criar mejor la que viene.",
   "El mes quedó más largo que la plata. Le pasa a medio Medellín, mor. La otra mitad no lo cuenta.",
   "Los números se pasaron, pero ustedes no se pierden: se hablan, se ajustan, se abrazan. Así sí.",
   "Este mes mostró por dónde se escapa la plata. Ya le conocemos el hueco, mor; ahora se tapa."],
  orio: [
   "El presupuesto se pasó. Pasa. Lo grave no es pasarse, es no mirar. Y ya miraron.",
   "Mes largo en gastos, como mis siestas: a veces se alargan y nadie se muere.",
   "Un número en rojo no es una sentencia: es un letrero que dice «por aquí con cuidado».",
   "Gastar de más un mes es humano. Corregir a tiempo es de sabios. Van en la segunda parte.",
   "Presupuesto superado. En esta casa eso se resuelve conversando, no culpando. Yo voto por conversar.",
   "Los números cuentan, no juzgan. Hoy cuentan que hay que ajustar. Y ajustar se puede.",
   "El presupuesto falleció antes del treinta. No busquen culpables: fue muerte natural. El primero nace otro.",
   "La plata se fue primero que el mes. Siempre ha sido de morir joven. Se cuida mejor a la próxima.",
   "No digo nada. Solo recuerdo que mañana sale el sol y el presupuesto reencarna el primero.",
   "El mes ganó este round. Tranquilos: no hay nocaut, hay revancha, y ya le conocen los golpes.",
   "Se recorta un poco el otro mes y listo. Matemática sin sufrimiento ni velorio.",
   "El que se cae se levanta. Con presupuesto nuevo y croquetas. Ya lo comprobé."]
 },
 vuelta: {
  coral: [
   "¡Mis papás! Los extrañé tanto que le ladré a la puerta tres veces. Sigan, sigan.",
   "Volvieron. Yo no lloré: fue un pelito en el ojo. Jiji. Bienvenidos, mor.",
   "La casa sin ustedes es una novela sin protagonistas. ¡Qué bueno verlos!",
   "No pregunto dónde estaban. Solo digo que la cola me va a mil. Bienvenidos.",
   "Hoy no hay regaño, hay besito. Empezamos de a poquito y lo demás se acomoda.",
   "Volver también es avanzar, papás. Hoy basta con un pasito chiquito.",
   "Las cuentas esperan, pero primero un abrazo. Después, lo que toque.",
   "Ave maría, aparecieron. Ya iba a pegar cartelitos en los postes con la foto de los dos.",
   "Los estaba extrañando más que a quincena en día veintiocho. Y eso es extrañar, mor.",
   "Pensé que se habían volado con otra app. Me hice la digna dos minutos. Ya se me pasó, jiji.",
   "Aquí todo los esperó quietico: las cuentas, el polvo y yo. El polvo engordó; yo también.",
   "Les guardé la mejor mirada de perrita enamorada. Es toda de ustedes."],
  orio: [
   "Volvieron. Yo estaba tranquilo: solo vigilé la puerta cada diez minutos. Casualidad.",
   "Qué bueno verlos. Lo digo con la ceja derecha, que es la sincera.",
   "Nadie lleva la cuenta de los días. Bueno, yo sí, pero con cariño.",
   "No importa cuánto faltaron. Importa que hoy están aquí, y eso ya es mucho.",
   "El que se va sin que lo echen vuelve sin que lo llamen. Pues aquí están.",
   "Los extrañé un poquito. Bueno, bastante. Pero no se lo digan a Coral.",
   "Ya les estaba guardando luto. Poquito: la ceja a media asta. Bienvenidos.",
   "Aquí todo sigue: las cuentas, las tareas y yo. De los tres, yo soy el más puntual.",
   "Volvieron. Los recibos no se fueron nunca: esos son más fieles que yo. Con calma los vemos.",
   "Retomar es fácil: una cosa hoy, dos mañana. El que arranca despacio llega entero.",
   "Aparecieron. Cancelo el novenario que les tenía listo. Qué bueno, que salía caro.",
   "No hay afán de ponerse al día. Hay gusto de que estén. Lo demás se cuadra."]
 },
 logro: {
  coral: [
   "¡Logro desbloqueado, mis papás! Me dieron ganas de bailar con las cuatro patas a la vez.",
   "Eso es talento, mor. Se ve, se nota y yo lo aplaudo con las orejas.",
   "Lo lograron juntos. Eso vale más que la medalla, aunque la medalla también está linda.",
   "Este logro se celebra con besito y media croqueta. La otra media es de Oreo, si se la gana.",
   "Un logro más. No es magia: son días de constancia disfrazados de premio.",
   "Celebren un ratico. Cuando uno celebra lo pequeño, lo grande llega con más ganas.",
   "Ave maría, qué berraquera de papás. Le voy a contar a toda la cuadra, con megáfono.",
   "Se lo ganaron a pulso y sin palanca. En esta ciudad eso tiene doble mérito, mor.",
   "¡Otro logro! La vitrina de la casa ya está más llena que bus de las seis.",
   "Qué orgullo. A la pereza ya le estamos cotizando el funeral, y va con descuento.",
   "Así me gustan: juiciosos de día y con ganas de celebrar de noche. Yo no pregunto, jiji.",
   "El que persevera alcanza, dice el refrán. Ustedes alcanzaron y todavía les quedó aliento."],
  orio: [
   "Logro desbloqueado. Mi ceja izquierda se levantó. Eso es ovación de pie.",
   "Bien hecho, papis. Sin aspavientos, que se me arruga la elegancia.",
   "Otro logro. Hay que reconocerlo: cuando se ponen serios, funcionan.",
   "Los logros no llegan solos: llegan de a dos. Como ustedes.",
   "Me lo esperaba. Lo dije bajito, por si acaso. Felicidades.",
   "Un logro es un recordatorio de que sí se puede. Guárdenlo para los días en que no parezca.",
   "Aplaudo con la cola. Con las manos no, que me faltan.",
   "Logro conseguido en vida. Así sí sirven los homenajes, no cuando ya para qué.",
   "Otro para la vitrina. A este paso les va a tocar dejarlos de herencia.",
   "La pereza los subestimó. Que en paz descanse su reputación.",
   "Esto no sale en ningún extracto, pero vale más que varios. Disfrútenlo.",
   "Lo que se hace en pareja rinde el doble y pesa la mitad. Lo demás es carreta."]
 }
};

/* Refuerzos para momentos que ya existían (se suman al banco, no lo reemplazan) */
const extras = {
 saludoM: {
  coral: ["Buenos días, mis amores. El sol salió y yo también, con las ganas intactas. ¿Empezamos con un tinto?",
          "Cada mañana es hoja en blanco. Hoy escriban bonito y sin tachones; la cola la pongo yo."],
  orio:  ["Al que madruga Dios le ayuda, pero al que ahorra le alcanza para el domingo.",
          "Buenos días. Hoy basta con ser un poquito mejores que ayer. Con un poquito alcanza."]
 },
 saludoT: {
  coral: ["A mitad de día todo se arregla con un almuerzo rico, una tarea hecha y un besito a la perrita.",
          "Ni se afanen ni se duerman, mis amores. El afán es del banco y el sueño es de Oreo."],
  orio:  ["La tarde es corta y el sofá es largo. Equilibren.",
          "Lo que no se hizo en la mañana todavía tiene tarde. Aprovéchenla antes de que le hagan el entierro."]
 },
 saludoN: {
  coral: ["Antes de dormir díganse algo lindo. Es gratis, no cobra recargo y rinde muchísimo.",
          "Buenas noches, mis papás. Lo que no se terminó hoy nadie se lo roba: mañana lo esperamos juntos."],
  orio:  ["Hoy no fue perfecto, pero fueron juntos. Eso también suma.",
          "Cierren el día con algo bonito: un abrazo, un gracias, un «mañana más». Yo cierro con un bostezo."]
 },
 pagoHecho: {
  coral: ["Pagar a tiempo es decirle al futuro «cuente con nosotros» y al recargo «hoy no, papito».",
          "Pagadito y sin sustos: así se cuida un hogar. El recibo se fue en paz y sin dolientes."],
  orio:  ["Cuentas al día, conciencia limpia y sofá libre. Vida de millonarios.",
          "Pagar sin drama sale más barato que pagar con recargo. Y el entierro es más discreto."]
 },
 tareaComp: {
  coral: ["Tarea cumplida y la casa huele a victoria. Entre los dos hasta el polvo se rinde, jiji.",
          "Una tarea menos y un abrazo más. Así se arma un hogar, mis amores."],
  orio:  ["Lavar la loza no es castigo: es el único deporte donde ganan los dos.",
          "Lo que se hace de a dos pesa la mitad y se disfruta el doble. Matemática del hogar."]
 },
 gasto: {
  coral: ["Anotadito y sin culpa: así se cuida el mes. Yo me encargo de la parte tierna, jiji.",
          "Gracias por anotar, mis amores. Cuentas claras, chocolate espeso y billete con partida de defunción."],
  orio:  ["Plata que no se anota, plata que se va de paseo sin avisar.",
          "Registrar es la mitad de cuidar. La otra mitad es no hacerse el loco. Van bien."]
 },
 ahorro: {
  coral: ["Cada abono es una semillita. Hoy la riegan; mañana hay sombra para los dos.",
          "Ahorrar juntos es el coqueteo que más me gusta: el que termina en casa propia."],
  orio:  ["Poquito a poquito se llena el costal. Y que se llene de viajes, no de culebras.",
          "No importa cuánto ahorran: importa que lo hacen. La constancia le gana al monto, casi siempre."]
 },
 racha: {
  coral: ["Racha encendida, mis amores. Esa llama no se apaga si le echan su poquito de constancia.",
          "Mientras sigan viniendo, yo sigo moviendo la cola. Es un trato justo."],
  orio:  ["Días seguidos. La constancia es aburrida, y por eso funciona.",
          "Una racha no se arma con ganas: se arma con hoy. Y hoy vinieron."]
 },
 meta: {
  coral: ["Cada peso que suman acerca el sueño. Hoy está más cerca que ayer, mor."],
  orio:  ["Una meta cumplida enseña que lo lejos solo era constancia con cara de imposible."]
 },
 animo: {
  coral: ["Un mal día no daña toda la película. Los quiero tal cual, mis papás."],
  orio:  ["Tranquilos: un mal día es un día, no una vida. Mañana hay otro, con tinto incluido."]
 }
};

Object.keys(nuevos).forEach(k => { F.f[k] = nuevos[k]; });
Object.keys(extras).forEach(k => { F.f[k].coral.push(...extras[k].coral); F.f[k].orio.push(...extras[k].orio); });

/* Refuerzos 2: más variedad por tipo (ver frases.js). */
const mas = {
 pagoProx: {coral: ["Ese recibo vence pronto, mor. Pagarlo hoy es la forma más barata de dormir tranquilos.","Ave maría, qué pereza los recargos. Paguen hoy y yo les muevo la cola de aplauso.","Pagar a tiempo es como llegar temprano a la cita: se ve divino y nadie suda.","Un pago a tiempo es un coqueteo con el futuro. Háganle, que el futuro es buen partido.","El recibo ya viene subiendo las escaleras, mis amores. Recíbanlo pagado y con la frente en alto.","No den papaya: recargo que huele miedo, muerde. Paguen hoy y que se vaya con hambre."],
  orio: ["Pago próximo. El tiempo es oro; el recibo, plomo. Mejor soltarlo pronto.","Ese recibo no se va a pagar solo. Ya probé mirándolo fijo y nada.","Pagar a tiempo es la única forma de tener enemigos que no escriben. Los recargos, digo.","Vencimiento cercano. Lo digo con calma, que es lo único que no cobra interés.","Aviso con tiempo para que no me culpen después. Soy perro de palabra, y de pocas.","La deuda a tiempo es visita. La deuda tarde es inquilina, y no paga."]},
 pagoHecho: {coral: ["¡Pagadito! Cuentas al día y papás con cara de domingo. Así me gusta verlos, mor.","Pagaron y el recibo se fue sin su propina de recargo. Qué elegancia, mis amores.","Cada pago hecho es una piedrita menos en el zapato. Hoy caminan más livianos.","Pago cumplido. Ni el banco puede quejarse, y mire que ese no se contenta ni con serenata.","Ave maría, qué descanso. Deuda muerta no cobra, mor. Brindemos con aguapanela.","Otro recibo que se va al cielo de los pagados. Allá no hay mora ni letra menuda, jiji."],
  orio: ["Pago hecho. La paz mental no se compra, pero sí se paga a tiempo.","Cumplieron. Lo celebro con un bostezo de aprobación, que es mi máximo honor.","Un recibo menos. La lista de preocupaciones adelgaza. Yo no, pero aplaudo.","Pagaron sin drama. El banco guarda silencio, que es su manera de dar las gracias.","Qué bonito es deber un poco menos. Casi tan bonito como no hacer nada.","Recibo cremado. Las cenizas, al archivo. Hoy duermen como yo: sin culpa."]},
 pagoAtrasado: {coral: ["Mor, ese pago se pasó de fecha. No es pecado: es un aviso con cariño. Hoy lo resuelven y respiramos.","El recibo llegó tarde a la cita y ya viene con recargo. Pásenlo hoy, mis amores.","Uy, se les pasó uno. Le pasa al más pintado. Lo bonito es arreglarlo ya.","No se me estresen: un pago atrasado se paga y se aprende. Hoy mismo, juntos.","Ave maría, se venció. Hoy lo pagan y mañana ni se acuerdan del susto.","Todavía tiene arreglo, mor. Lo único sin arreglo es la muerte, y este recibo sigue vivito y cobrando."],
  orio: ["Pago atrasado. Pasa. Lo que no pasa es que se pague solo.","El recibo venció y sigue ahí, como finado sin enterrar. Denle sepultura hoy, que cada día cobra más.","Se atrasó el pago. Sin juicios: pagar hoy es el mejor perdón que existe.","Esto no es regaño, es brújula: el pago está al norte. Caminen para allá.","Parce, la mora es como la humedad: callada, constante y cara. Se corta hoy.","Se pasó la fecha. El recibo ya es espanto: no lo dejen penando otra noche."]},
 tareaPend: {coral: ["Mor, hay una tarea esperando. Con música y yo de porrista, vuela.","Tarea pendiente es hueso enterrado: mejor sacarlo antes de que se olvide dónde quedó.","Entre los dos, esa tarea dura lo que un tinto. Ánimo, mis amores.","Mijo, mija, la casa los quiere. Denle quince minuticos y les devuelve paz.","Lo difícil es empezar, mor. Como todo lo rico: después nadie quiere parar. Jiji.","Ave maría, esa escoba está más sola que la una. Sáquenla a bailar un ratico."],
  orio: ["Hay una tarea pendiente. No muerde, pero mira feo.","Empiecen por la más chiquita. El resto cae solo, como dominó cansado.","La tarea espera. Yo también espero: la comida. Cada cual con su paciencia.","Tarea pendiente no define a nadie. Pero hacerla da una paz que ni el pago de la prima.","Casa limpia, mente liviana. Lo dice un perro que vive del polvo y del sofá.","El mugre no descansa en paz: descansa en la sala. Sáquenlo, papis."]},
 tareaVieja: {coral: ["Esa tarea lleva tantos días que ya le salieron canas. Hoy le damos gusto, mor.","Lo que se deja pasar acumula intereses de pereza, mis amores. Hoy la cancelamos de contado.","Esa tarea tiene paciencia de santa. Hoy le damos el cierre que se merece.","No hay culpa, hay oportunidad: hoy es un buen día para despedirla.","Esa tarea ya es de la familia: hasta sale en las fotos. Hagámosla antes de que pida apellido.","Qué pecao, tan olvidada. Si fuera mata, ya estaría seca. Hoy la revivimos, mor."],
  orio: ["Esa tarea ya tiene días. Cumple años y todo. Hoy la despedimos.","Lo postergado no desaparece: se pone de mal genio. Háganla hoy y se reconcilian.","Admiro la paciencia de esa tarea. Ustedes admiren su fecha de salida: hoy.","Sin regaño: hoy es perfecto para tacharla. Se siente mejor de lo que se imagina.","Una tarea vieja pesa más que una nueva. Quítenle el peso y respiren.","Esa tarea ya prescribió, pero en esta casa los muertos se entierran. Pala y hágale."]},
 tareaComp: {coral: ["¡Tarea hecha! La casa más bonita y mis papás más guapos. Es ciencia.","Otra tarea menos y otro punto más. Qué equipo tan sabroso son ustedes, mor.","Cumplida. Hasta la escoba quiere autógrafo, jiji.","Lo que se hace con cariño brilla, y esto brilla harto. Bravo, mis amores.","Tarea lista. Hoy se ganaron el derecho a mirar el techo sin culpa. Y acompañados, mejor.","Ave maría, quedó eso que da pesar pisarlo. Pisen, pues, que para eso es de ustedes."],
  orio: ["Tarea hecha. La casa lo nota, aunque no diga nada. Yo sí lo digo: bien.","Una menos. A ese ritmo, el sofá los espera con los brazos abiertos.","Lo hicieron sin que nadie obligara. Eso es carácter. O ganas de sofá. Igual sirve.","Casa ordenada, cabeza ordenada. Gran negocio por poca energía.","Hecha. El mugre no alcanzó ni a despedirse. Así, sin velorio, es mejor.","Cumplieron. El orden es felicidad en dosis pequeñas. Hoy se sirvieron doble."]},
 meta: {coral: ["¡Meta lograda! Se los dije, mor: soñar con constancia funciona. Tres vueltas de cola.","Lo lograron, mis amores. Esto sí es un sueño con paz y salvo. Qué orgullo.","Lo que ayer era idea hoy es realidad. Yo lloro, pero de pelo en el ojo.","Hoy se ganaron un aplauso largo y un abrazo más largo. El resto se celebra en casa, jiji.","Ave maría, coronaron. Y sin rifa, sin chance y sin tío rico. A puro juicio.","Una meta menos en la lista, y mil ganas más para la que sigue. Así se vive, mor."],
  orio: ["Meta lograda. Quedó demostrado que lo lento también llega. Como yo a la puerta.","Lo lograron. Acuérdense de hoy cuando el próximo sueño parezca lejos.","Hay quien sueña toda la vida. Ustedes soñaron y además pagaron. Otro nivel.","No fue suerte: fue ahorro, paciencia y días buenos y malos. Juntos. Eso es lo que vale.","Se acabó la espera. Celebren, que la próxima meta aguanta un fin de semana.","Esa plata tenía todo para morir joven y ustedes la hicieron llegar. Mis respetos."]},
 ahorro: {coral: ["Ahorro aportado. Cada peso es un abrazo para el futuro de los dos, mor.","Ese abono suena a viaje, a calma y a vida más liviana. Qué rico.","Poquito a poquito se llena el cántaro. Hoy le echaron una buena gota.","Ni sueldo grande ni chiquito: lo que cuenta es el hábito. Y ustedes ya lo tienen.","Cada aporte es un voto de confianza entre ustedes. Eso sí vale oro, jiji.","Guardar plata es darle papaya al futuro, y esa es la única papaya que se vale dar."],
  orio: ["Abono hecho. La meta se acerca un pasito. El sofá no, pero igual celebro.","Ahorrar es la manera elegante de decirle no a un antojo y sí a un plan.","Las metas se logran con muchos días iguales, no con un día épico. Hoy fue uno de esos.","Hay quien ahorra cuando sobra. Ustedes ahorran cuando se puede. Mucho mejor.","Poca plata hoy, mucha calma mañana. Así funciona esto, papis.","Otro billete rescatado de la fosa común de los antojos. Bien ahí."]},
 racha: {coral: ["¡La racha sigue! Cada día que vienen me gano la mejor alegría del día.","Más días seguidos, más brillo en esa llama. Qué constancia tan sabrosa, mor.","La racha crece porque ustedes cumplen. Yo solo muevo la cola desde la tribuna.","Lo bueno se arma de a poquitos: el sancocho, el amor y esta racha.","Cada día cuenta, mis amores. Hoy contaron otra vez.","La racha es una promesa chiquita repetida muchas veces. Y ustedes cumplen más que novio recién perdonado."],
  orio: ["La racha sigue viva. No es magia: es no rendirse un día cualquiera.","Racha en pie. Lo difícil no es empezar, es volver mañana. Y ustedes vuelven.","Volvieron otra vez. Eso dice más de ustedes que cualquier discurso.","Cada día suma a la racha y a los dos. Esa parte no sale en puntos.","Una racha es como una siesta bien hecha: rutina y cero culpa.","La racha sigue con vida. A estas alturas ya enterró a más de un propósito de enero."]},
 rachaRiesgo: {coral: ["Mor, la racha se está apagando. Una tareíta y la llama vuelve con ganas.","No la dejen caer, que da pesar. Con una tarea hoy, seguimos.","Ojo, mis amores: queda poquito para salvarla. Yo les alcanzo la escoba.","La racha pide una última vueltica del día. Hágale pues, que ya casi.","Racha que se cae se levanta, pero cuesta el doble. Mejor hoy, mijo.","La racha está pidiendo pista, mor. Una tarea y no se nos va tan jovencita."],
  orio: ["Racha en riesgo. Lo bueno cuesta. Hoy cuesta una tarea.","Solo una cosa más y la racha sigue. Yo la haría, pero no tengo pulgares.","La racha pide una razón para seguir viva. Denle una tarea.","Sin presión: una tarea hoy y la racha duerme tranquila. Y yo también.","Se puede perder una racha, pero no tiene por qué ser hoy. Hágale.","La racha tiene pulso, pero bajito. Una tarea y la revivimos."]},
 cumple: {coral: ["¡Feliz aniversario, mis amores! Cada día juntos es un regalo que no cabe en el moño.","Otro año cuidándose. Yo hago de cuenta que organicé la fiesta, jiji.","Se quieren, se aguantan y me dan croquetas. Qué relación tan completa.","El amor bonito no es el de las películas: es el de todos los días. Ustedes lo tienen.","Celebren, mor: el mejor plan de hoy es mirarse y acordarse de por qué empezaron.","Un año más de ustedes. Si toca volver a escogerlos, firmo sin leer la letra menuda."],
  orio: ["Feliz aniversario. Otro año aguantándose y todavía se ríen. Eso es amor del bueno.","Años juntos y seguimos vivos. Es un récord que yo respeto.","Hoy no se trata de regalos. Se trata de agradecer que el otro sigue aquí.","Aniversario: el día en que dos decidieron seguir intentándolo. Aplaudo en silencio.","Lo mejor del amor largo es que ya no tiene que demostrar nada. Y aun así lo demuestra.","El amor de ustedes ha sobrevivido a más fines de mes que cualquier banco. Felicidades."]},
 saludoM: {coral: ["Buenos días, mis amores. Hoy es un lienzo en blanco; yo traigo los colores y las ganas.","Arriba, mor, que el día espera y yo ya ensayé tres vueltas de bienvenida.","Buenos días. El café huele rico y ustedes, mejor. Vamos a hacer cosas bonitas.","Hoy es un buen día para ser juiciosos y también para dejarse querer. Combinen.","Despierten con calma, que la casa no se va. Yo les calenté el puesto en la cama.","Ave maría, qué caras de sueño tan lindas. Tinto, arepa y a darle, que los recibos no se asustan solos."],
  orio: ["Buenos días. Lo mejor del día es que todavía no ha empezado a complicarse.","Arrancamos. Poquito a poquito, que a mí también me cuesta el primer paso.","Hoy no hace falta ser perfectos. Basta con aparecerse con buena cara. O con cara.","Que el café sea fuerte y el humor, negro. Yo vigilo desde la cobija.","Buenos días, papis. Antes de salir, un abrazo. Es gratis y rinde para todo el día.","Otro día sobre la tierra y no debajo. Con ese saldo a favor, cualquier lunes se aguanta."]},
 saludoT: {coral: ["Buenas tardes, mis amores. Hora perfecta para un tintico y una tarea chiquita.","Ya pasó medio día y van bien. Mijo, mija, sigan así que me tienen orgullosa.","La tarde es larga, pero con ustedes y una croqueta se pasa volando.","Qué pereza tan rica la de la tarde. Hagan lo suyo y después, sofá con besito.","Si algo salió torcido hoy, todavía hay tarde para enderezarlo. Y si no, para reírnos.","Tarde de Medellín: llueva o haga sol, la plata se evapora igual. No salgan a antojarse, mor."],
  orio: ["Buenas tardes. A esta hora el sofá nos mira con ternura. No le hagan el feo.","Mitad de día. Ni afán ni abandono: ritmo de perro viejo.","La tarde es para terminar lo empezado y empezar lo que se termina mañana.","Si la mañana fue torpe, la tarde es el desquite. Sin afán.","Lo importante hoy no es hacerlo todo, sino hacer lo que sí importa.","A esta hora el día ya tiene más pasado que futuro. Como yo. Y miren qué bien lo llevo."]},
 saludoN: {coral: ["Buenas noches, mis amores. Hoy hicieron lo que pudieron y eso ya es mucho. A dormir.","La noche es para cerrar el día con un abrazo. Yo les guardo el lado calientico.","Descansen, mor, que mañana también somos nosotros. Y con ganas.","Apaguen el celular y prendan el cariño. Es el mejor plan nocturno que conozco, y el más barato.","Hoy sumaron, aunque no lo sientan. Mañana sumamos otro poquito.","Lo pendiente no se muere por esperar una noche. Ustedes, a soñar bonito."],
  orio: ["Buenas noches. Lo que quedó pendiente aprende a esperar, como yo con la comida.","Dormir también es productivo. Lo digo con experiencia profesional.","Hoy fue lo que fue. Mañana hay otra oportunidad, con tinto nuevo.","A esta hora hasta los problemas bostezan. Déjenlos, que amanecen más chiquitos.","Cierren la jornada con un gracias. Cuesta cero y se duerme mejor.","Buenas noches, papis. Nadie ganó el día, pero nadie lo perdió. Tablas, y sin heridos."]},
 gasto: {coral: ["Gasto anotado. Qué lindura de papás ordenados. Así se cuida el mes, mor.","Lo que se anota se controla, y lo que se controla duele menos. Gracias, mis amores.","Otro registro y otra pista de adónde se va la plata. Eso es poder, jiji.","Anotar un gasto es mirar la plata a los ojos antes de que se vaya. Qué valientes.","Apuntado. Si de aquí al viernes quedan ganas de más, lo hablamos con calma y con tinto.","Cuentas claras, corazones contentos, perrita feliz. Siga anotando, mijo."],
  orio: ["Gasto registrado. La plata no desaparece: se va con nombre y apellido.","Anotado. Ya sabemos dónde estuvo la plata. Nada más reconfortante que la verdad.","Un gasto más en la lista. No juzgo: observo y bostezo.","Registrar es de sabios. O de gente con mala memoria. En todo caso, bien hecho.","Cada gasto anotado es un caso resuelto. Ya sabemos quién se llevó el billete: fue el antojo.","Anotar la plata es como identificar al difunto: triste, pero evita enredos después."]},
 presup: {coral: ["Mor, el presupuesto va casi al tope. Respiremos y miremos qué se puede mover.","Esta categoría ya está pidiendo cacao. Con un ajuste chiquito vuelve a respirar.","Ojo, mis amores: queda poquito. Gastar con cabeza es el mejor perfume.","No es drama, es pista. Revisemos juntos antes de que el mes se ponga intenso.","Cuando el límite aprieta, la creatividad despierta. Plan de hoy: besos, que no pasan por caja.","Casi llegan al tope. Lo bueno: aún hay tiempo de ajustar sin sufrir."],
  orio: ["Presupuesto al límite. Lo bueno del borde es que todavía no es el hueco.","Queda poco en esta categoría. Gastar menos no es sufrir: es elegir.","Cerca del tope. Calma. Lo que no se gasta hoy es el domingo de mañana.","Cada peso de más hoy es uno menos para lo que de verdad quieren. Piénsenlo en el sofá.","Casi no queda. Es hora de preguntar qué es antojo y qué es necesidad.","A esta categoría le queda menos vida que a helado al sol. Con cuidado."]},
 hormiga: {coral: ["Mor, los gastos chiquitos se juntan y bailan en grupo. Pilas, que son muchos.","Un cafecito aquí, un domicilio allá, y a fin de mes eso ya parece novela. Miremos el capítulo.","Los gastos hormiga no hacen ruido, pero se llevan la torta completa. Cuidémosla.","No es prohibido darse gustos, mis amores: es darse los que de verdad valen la pena.","Ave maría, cuántas hormiguitas en la despensa. Mejor contarlas hoy.","Antes de comprar lo chiquito, pregunten si lo grande que quieren no se pone triste."],
  orio: ["Gasto hormiga detectado. Pequeño, silencioso y constante. Como yo cuando pido comida.","Muchos poquitos hacen un mucho. Matemática cruel pero cierta.","Un gusto de vez en cuando es vida. Un gusto todos los días es un hábito con precio.","Las hormigas no son malas, pero tampoco son gratis. Cuéntenlas.","No juzgo. Solo señalo, con elegancia perruna, que el cafecito se repite mucho.","A la quincena no se la llevó un gasto grande. Fueron muchos chiquitos y todos tienen coartada."]},
 lujos: {coral: ["Mor, este mes hubo harto lujito. Se vale gozar, y también se vale ajustar con ternura.","Un mes con gustos grandes. No hay culpa: hay información para el siguiente.","Los lujos son lindos, mis amores, pero las metas también. Busquemos el equilibrio.","Gozar sin quebrarse es un arte. Este mes lo practicaron; el otro lo afinamos.","Lo bailado nadie lo quita, mor. Lo cobrado tampoco, jiji. Se asume con gracia y se ajusta.","Lo bonito se disfruta, pero se planea. El otro mes lo hacemos más suavecito."],
  orio: ["Mes de lujos. Se disfrutó, y eso vale. Ahora toca equilibrar con calma.","Los lujos tienen un defecto: no son gratis. Y una virtud: se recuerdan.","Un mes generoso con ustedes mismos. El siguiente puede ser generoso con las metas.","Una buena vida se arma con gustos y con límites. Este mes ganó el gusto. Por goleada.","Para el otro mes, un lujo menos y una meta más. Trato razonable, creo.","Lo comido y lo bailado nadie se los quita. El extracto tampoco. Se asume y se sigue."]},
 mesCerrado: {coral: ["¡Mes cerrado, mis amores! Cumplieron y se nota. Mor, qué orgullo de papás.","Otro mes en el bolsillo y en la memoria. Gracias por hacerlo juntos.","Cerrar el mes en paz es deporte de equipo. Ustedes siempre ganan.","Lo hicieron. Celebremos con tinto y caminada, que es plan barato y rico.","Cada mes cerrado es un ladrillo de la casa que sueñan. El de hoy quedó bien parejo.","Ave maría, otro mes despachado y ustedes enteros. Ni el mes pudo con mis papás."],
  orio: ["Mes cerrado. Ni drama ni gloria: orden. Y el orden es el lujo más barato.","Terminó el mes. Qué bueno haberlo llevado juntos. Eso nadie se los quita.","Cierre hecho. Mañana se vuelve a empezar, con más experiencia y la misma siesta.","Cuentas cerradas. Lo importante: sigue habiendo cariño después de las cifras.","Confieso que me gusta cuando cierran el mes. Es como cerrar un buen libro.","Otro mes al cementerio de los meses. Este se fue con las cuentas claras: va derecho al cielo."]},
 animo: {coral: ["Mor, hoy puede que cueste, pero juntos todo pesa menos. Aquí estoy, con cola y todo.","Ustedes hacen lo que pueden y a mí me parece muchísimo. No lo olviden.","Los días torcidos también pasan. Y uno sale más fuerte, como el café.","Si hoy se sienten pequeños, recuerden que mi amor por ustedes es grande y peludo.","No tienen que poder con todo. Tienen que poder el uno con el otro. Y pueden.","Ave maría, que no cunda el pánico: de peores nos hemos reído. Y nos vamos a volver a reír."],
  orio: ["No se exijan tanto. La perfección es aburrida y ustedes no son aburridos.","Descansar no es rendirse. Es cargar baterías. Lo sé por experiencia profesional.","Lo que hoy pesa, mañana se cuenta como anécdota. Dejen que pase el día.","Están haciendo más de lo que creen. Yo lo veo desde acá, y yo veo muy bien.","La vida es larga y la siesta, corta. Aprovechen ambas.","Mientras estemos vivos y con tinto, todo lo demás es negociable."]},
 diaSinGasto: {coral: ["Día sin gastos y todos felices. La billetera hoy mueve la cola, como yo.","Qué rico un día sin gastar. Pura caminada, pura charla y cero recibo.","La plata que no sale te saluda mañana. Hoy mandó saludo con beso.","Un día así es un respiro para el bolsillo y para el alma. Repitan cuando puedan.","Ayer ganaron sin jugar. Eso se llama no gastar, y es un arte, jiji.","Ave maría, ni un peso. Ayer la plata se acostó viva y completa. Qué milagro tan lindo."],
  orio: ["Día sin gastos. El bolsillo respira. Yo también, de alivio solidario.","Hoy no gastaron. Eso no es sacrificio: es una victoria silenciosa.","Un día en blanco en la lista de gastos. Pocas cosas son tan bonitas como un papel limpio.","No gastar un día enseña que se puede. Y saber que se puede es medio camino.","Cero movimientos. El banco los mira con respeto y algo de miedo.","Hoy la plata durmió en casa. Ningún billete salió con los pies por delante."]},
 mesPasado: {coral: ["Mor, este mes se pasó el presupuesto. Se mira, se aprende, se ajusta. Nada de culpa.","Mes largo, mis amores. Esto no los define: los informa. Y con eso hacemos algo mejor.","Ni se pelean ni se regañan. Se sientan, se ríen y ajustan. Así se hace en esta casa.","No hay presupuesto perfecto. Hay pareja que se habla. Y ustedes se hablan, mor.","El mes se pasó, pero ustedes siguen juntos y con ganas. Esa es la cifra que más cuenta.","Ave maría, el mes nos cogió ventaja. Tranquilos: en la otra vuelta lo alcanzamos, y con tinto."],
  orio: ["Presupuesto superado. No es tragedia, es dato. Los datos se usan, no se lloran.","Un mes pasado de plata. Ajusten sin drama y sigan. Yo me ocupo de la parte tranquila.","Gastar de más pasa. Repetirlo sin mirar es lo que duele. Y ya miraron.","Lo que costó ayer enseña mañana. Es la matrícula de una clase que ya pagaron.","Sin culpas: miren el número, respiren y ajusten una cosita. Con una basta.","Al presupuesto se le hace entierro sencillo y sin reproches. El primero llega el reemplazo."]},
 vuelta: {coral: ["¡Volvieron! Los extrañé tantísimo que hasta le ladré al cojín. Bienvenidos, mor.","Qué rico verlos de nuevo. La casa estaba más callada que velorio sin tinto.","Bienvenidos a casa. Aquí nada se perdió: todo los esperaba con cariño.","Volver también es un logro. Hoy retomamos con calma y ganas.","Ni preguntas ni reproches: lo bonito es que están aquí. Empecemos de nuevo, juntos.","Me alegra tanto que volvieran que la cola ya no me obedece."],
  orio: ["Volvieron. No dije nada porque no me gusta presumir de extrañarlos.","Bienvenidos. La rutina los esperaba sin afán. Yo, con el sofá caliente.","Ausentarse un tiempo no es perder el rumbo. Volver es lo que cuenta.","Qué bueno tenerlos otra vez. No lo digo mucho, pero lo digo.","Retomar es más fácil de lo que parece. Empiecen por una cosita y listo.","Aquí nada se murió en su ausencia. Bueno, una mata. Pero esa ya venía mal."]},
 logro: {coral: ["¡Logro desbloqueado! Qué talentosos, mis amores. Yo lo supe desde que los olí.","Un logro más en la repisa. Ya no me alcanzan las medallas, jiji.","Cada logro prueba que vienen constantes. Qué orgullo de papás.","Lo lograron juntos. Eso vale más que el logro mismo, mor.","Hoy se ganaron un aplauso y yo, la cola completa.","Ave maría, otro logro. Sigan así y me toca cobrar la entrada para verlos."],
  orio: ["Logro desbloqueado. No lo hicieron por la medalla, pero igual se ve linda.","Lo que parecía rutina era camino. Miren cuánto han recorrido.","Dicen que no hay que dormirse en los laureles. Yo me duermo; ustedes no.","Esto es lo que pasa cuando uno insiste. Y ustedes insisten bonito.","Lo lograron. Ahora respiren, sonrían y sigan. Yo me quedo con la parte de aplaudir.","Otro logro. A este paso la pereza va a tener que buscar trabajo en otra casa."]}
};
Object.keys(mas).forEach(k => { F.f[k].coral.push(...mas[k].coral); F.f[k].orio.push(...mas[k].orio); });

/* Chistes, consejos, madrugada e interjecciones extra (ph.animo y ph.chiste comparten arreglo con f.animo y chistes). */
const chis = {
 coral: ["Mi plan financiero: ladrar más duro que el recibo. No funciona, pero me veo divina.",
  "El dinero no da la felicidad. Una croqueta tampoco, pero cómo ayuda, mor.",
  "Ave maría, qué pereza el lunes. Pero con ustedes hasta el lunes viene con moño.",
  "El que tiene un perro tiene un tesoro; el que tiene dos, un presupuesto apretado. Vale la pena, jiji.",
  "Yo no ahorro, pero entierro huesos para el futuro. Es lo mismo, con más tierra.",
  "Si el amor fuera plata, ustedes serían estrato seis. Por ahora, estrato seis de cariño.",
  "No hay mal que dure cien años ni recibo que dure treinta días sin volver a llegar.",
  "La plata y yo tenemos una relación abierta: ella sale con todo el mundo y yo la espero en casa."],
 orio: ["Mi plan de inversión es dormir. Rinde poco, pero cero riesgo y mucha paz.",
  "La única deuda que me preocupa es la de croquetas. Y esa la paga David.",
  "Mi humor negro es como el tinto sin azúcar: amargo, pero despierta.",
  "¿Qué es peor que un recibo vencido? Dos. Es matemática y también teatro.",
  "Nadie me paga por vigilar la casa, pero tampoco renuncio. Eso es vocación.",
  "El cuatro por mil es la limosna que le damos al banco para que nos deje tocar nuestra plata.",
  "Al difunto le perdonan todo menos el crédito. Ese lo heredan. Paguen en vida.",
  "La muerte es gratis, pero el entierro no. Hasta para eso hay que ahorrar."]
};
const ani = {
 coral: ["Hoy me siento orgullosa de ustedes sin motivo grande: es que se esfuerzan y yo lo veo.",
  "Mis amores, tropezar también es avanzar si uno se levanta cogido de la mano.",
  "Háganse un favor: hoy no se comparen con nadie. El vecino también debe, pero no lo cuenta.",
  "Los quiero tal cual, con sus días buenos y sus días de pelo de loca. Eso es amor, mor.",
  "Si hoy el mundo pesa, repártanlo entre dos. Matemática básica y cariño avanzado."],
 orio: ["No hace falta correr. Quien llega tranquilo, llega entero. Yo lo aprendí en el sofá.",
  "Lo que hoy duele, mañana enseña y pasado mañana da risa. Denle tiempo.",
  "Descansen sin culpa. El mundo no se cae porque se sienten cinco minutos.",
  "Lo están haciendo bien. No lo digo seguido, así que guárdenlo.",
  "Un paso pequeño sigue siendo un paso. Y nadie les cobra intereses por ir despacio."]
};
const tipsMas = [
 {d:'coral',c:'plata',t:"Pónganle nombre a cada peso del mes, mor. Plata con nombre se cuida; plata sin nombre se muere sin doliente."},
 {d:'orio',c:'plata',t:"El fondo de emergencia es el paraguas que se compra antes del aguacero. Y en Medellín siempre llueve. Empiecen por poquito."},
 {d:'coral',c:'pareja',t:"Díganse lo que agradecen, no solo lo que les falta. Una frase bonita al día mantiene viva la casa."},
 {d:'orio',c:'pareja',t:"No siempre hay que arreglar el problema del otro. A veces basta con escuchar y servir un tinto."},
 {d:'coral',c:'bienestar',t:"Salgan a caminar juntos aunque sea quince minutos. Caminando al lado se habla distinto, y no cobran parqueadero."},
 {d:'orio',c:'bienestar',t:"Dormir bien arregla la mitad de los problemas. La otra mitad también, pero se nota menos."},
 {d:'coral',c:'metas',t:"Celebren los avances chiquitos. Una meta grande se arma con muchas fiestas pequeñas."},
 {d:'orio',c:'metas',t:"La paciencia es la inversión que no sale en el banco pero rinde más. Y no cobra cuota de manejo."},
 {d:'coral',c:'gratitud',t:"Antes de dormir, nombren tres cosas buenas del día, aunque sea el tinto. Con eso se duerme rico."},
 {d:'orio',c:'hogar',t:"Una casa limpia no es la que nunca se ensucia: es la que se arregla entre los dos sin que haya heridos."}
];
Object.keys(chis).forEach(d => { F.chistes[d].push(...chis[d]); });
Object.keys(ani).forEach(d => { F.f.animo[d].push(...ani[d]); });
tipsMas.forEach(t => { F.tips.push(t); F.ph[t.d].consejo.push(t.t); });
F.madrugada.coral.push("Mor, a esta hora hasta las ideas bostezan. Mañana se ven mejor, y con tinto.", "Yo los cuido desde el pie de la cama. Duerman, que la guardia es mía.", "Madrugar es de gallos y de enamorados. Si es lo segundo, sigan; si es por cuentas, a dormir.");
F.madrugada.orio.push("La madrugada es mala consejera de plata. Duerman y decidan con sol.", "Todo tranquilo. Hasta mi conciencia, que hoy no tiene nada pendiente.", "Los problemas de las tres de la mañana a las nueve parecen bobadas. Y las deudas no cobran de noche.");
F.interj.urgente.coral.push('¡Qué pecao!','¡Hágale pues!'); F.interj.urgente.orio.push('Ajá...','Se asomó la parca.');
F.interj.alegre.coral.push('¡Qué belleza!','¡Bravo, mor!'); F.interj.alegre.orio.push('Pues sí.','Eso, papis.');
F.interj.calma.coral.push('Aquí con ustedes.','Quiubo, mis amores.'); F.interj.calma.orio.push('Sin afán.','Seguimos vivos.');
})();
