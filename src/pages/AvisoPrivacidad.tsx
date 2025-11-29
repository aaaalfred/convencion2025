import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AvisoPrivacidad() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Aviso de Privacidad" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Aviso de Privacidad para el uso de Identificación Facial
                </CardTitle>
                <p className="text-lg font-semibold text-primary mt-2">
                  Concurso "Convención Nacional SAHUAYO 2025" – App Recompensas Herdez
                </p>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  En cumplimiento de la legislación aplicable en materia de protección de datos personales,{' '}
                  <strong>Grupo McTree</strong> (en adelante, el <strong>"Responsable"</strong>), pone a disposición de los participantes el presente{' '}
                  <strong>Aviso de Privacidad</strong> relativo al tratamiento de sus datos personales y datos
                  biométricos de identificación facial con motivo de su participación en el concurso{' '}
                  <strong>"Convención Nacional SAHUAYO 2025"</strong> (en adelante, el <strong>"Concurso"</strong>),
                  a través de la aplicación móvil <strong>Recompensas Herdez</strong>.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">1. Finalidades del tratamiento</h3>
                <p>
                  Los datos personales y biométricos que se recaben se tratarán para las siguientes{' '}
                  <strong>finalidades primarias</strong> relacionadas directamente con el Concurso:
                </p>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>
                    Registrar tu participación en el Concurso a través de la <strong>app Recompensas Herdez</strong>.
                  </li>
                  <li>
                    Verificar tu identidad mediante <strong>identificación facial</strong> para evitar registros
                    duplicados o fraudulentos.
                  </li>
                  <li>
                    Validar que cada persona participante corresponda a un único registro dentro del Concurso.
                  </li>
                  <li>Administrar, dar seguimiento y gestionar el desarrollo del Concurso.</li>
                  <li>
                    Contactarte para brindarte información relacionada con tu participación (por ejemplo: confirmación
                    de registro, aclaraciones, estatus del proceso).
                  </li>
                </ol>
                <p className="mt-3">
                  <strong>En ningún caso</strong> los datos personales o biométricos serán utilizados para fines de
                  publicidad, mercadotecnia, prospección comercial o perfilamiento ajenos al Concurso.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">2. Datos personales que se recaban</h3>
                <p>
                  Para las finalidades antes señaladas, el Responsable podrá recopilar los siguientes datos a través
                  de la app Recompensas Herdez:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    <strong>Datos de identificación:</strong> nombre, apellido(s), fecha de nacimiento, país de
                    residencia (México) y, en su caso, número de participante o identificador interno.
                  </li>
                  <li>
                    <strong>Datos de contacto:</strong> número de teléfono, correo electrónico y cualquier otro medio
                    de contacto que proporciones en el registro.
                  </li>
                  <li>
                    <strong>Datos biométricos de identificación facial:</strong> imagen o video de tu rostro, así como
                    patrones o vectores derivados de dicha imagen que permitan la verificación de identidad dentro del
                    sistema.
                  </li>
                </ul>
                <p className="mt-3">
                  El uso de la <strong>identificación facial</strong> es un requisito operativo para validar el
                  registro único de las personas participantes dentro del Concurso.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">3. Medio de obtención de los datos</h3>
                <p>
                  Los datos personales y biométricos se obtienen <strong>directamente de ti</strong>, cuando:
                </p>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>
                    Te registras en el Concurso a través de la <strong>app Recompensas Herdez</strong>.
                  </li>
                  <li>Aceptas este Aviso de Privacidad dentro de la app, previo a completar tu registro.</li>
                  <li>
                    Autorizas el uso de la cámara de tu dispositivo y realizas el proceso de{' '}
                    <strong>identificación facial</strong> siguiendo las instrucciones en pantalla.
                  </li>
                </ol>

                <h3 className="text-xl font-semibold mt-6 mb-3">4. Vigencia y conservación de los datos</h3>
                <p>
                  El Concurso tendrá vigencia del <strong>1 de diciembre de 2025</strong> al{' '}
                  <strong>3 de diciembre de 2025</strong>.
                </p>
                <p>
                  Tus datos personales y biométricos serán conservados{' '}
                  <strong>únicamente durante la vigencia del Concurso</strong> y por un periodo adicional estrictamente
                  necesario para:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Verificar la correcta participación y registro único de las personas.</li>
                  <li>Atender aclaraciones relacionadas con la participación en el Concurso.</li>
                </ul>
                <p className="mt-3">
                  Este periodo adicional no excederá de <strong>90 días naturales</strong> posteriores a la fecha de
                  cierre del Concurso. Concluido dicho plazo:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    Los <strong>datos biométricos de identificación facial</strong> serán eliminados de forma segura y
                    definitiva de nuestros sistemas y/o de los sistemas del proveedor tecnológico que opere la
                    identificación facial.
                  </li>
                  <li>
                    Los demás datos personales que no sea necesario conservar por obligaciones legales o
                    administrativas serán eliminados o anonimizados.
                  </li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">5. Transferencias y encargados</h3>
                <p>Tus datos personales podrán ser compartidos únicamente en los siguientes supuestos:</p>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>
                    <strong>Encargados de tratamiento (proveedores de servicios):</strong> con empresas que nos prestan
                    servicios de soporte tecnológico, alojamiento de información, seguridad informática, operación de
                    la app Recompensas Herdez o sistemas de identificación facial, exclusivamente para cumplir las
                    finalidades señaladas en este Aviso.
                  </li>
                  <li>
                    <strong>Autoridades competentes:</strong> en caso de requerimiento formal y fundado, para el
                    cumplimiento de obligaciones legales.
                  </li>
                </ol>
                <p className="mt-3">
                  En todos los casos, dichos terceros estarán sujetos a obligaciones de confidencialidad y protección
                  de datos personales, y <strong>no podrán utilizar tu información para fines propios</strong>{' '}
                  distintos a los aquí indicados.
                </p>
                <p>
                  No se llevarán a cabo transferencias de tus datos para fines de mercadotecnia o prospección comercial
                  por parte de terceros ajenos al Concurso.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">6. Medidas de seguridad</h3>
                <p>
                  El Responsable implementará medidas de seguridad <strong>administrativas, técnicas y físicas</strong>{' '}
                  razonables y adecuadas para proteger tus datos personales y biométricos contra daño, pérdida,
                  alteración, destrucción o uso, acceso o tratamiento no autorizado.
                </p>
                <p className="mt-3">
                  No obstante lo anterior, ningún sistema es completamente seguro, por lo que el Responsable no puede
                  garantizar al 100% la seguridad de la información ante eventos fuera de su control razonable (por
                  ejemplo, ataques maliciosos externos altamente sofisticados); sin embargo, se compromete a actuar de
                  conformidad con la normativa aplicable y los protocolos internos de respuesta ante incidentes.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">7. Derechos ARCO y revocación del consentimiento</h3>
                <p>Como titular de los datos personales, tienes derecho a:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    <strong>Acceder</strong> a tus datos personales en posesión del Responsable.
                  </li>
                  <li>
                    <strong>Rectificar</strong> tus datos en caso de ser inexactos o incompletos.
                  </li>
                  <li>
                    <strong>Cancelar</strong> tus datos cuando consideres que no se requieren para alguna de las
                    finalidades señaladas o hayan dejado de cumplirse.
                  </li>
                  <li>
                    <strong>Oponerte</strong> al tratamiento de tus datos para fines específicos.
                  </li>
                </ul>
                <p className="mt-3">
                  Asimismo, puedes <strong>revocar tu consentimiento</strong> para el tratamiento de tus datos
                  personales y biométricos. Ten en cuenta que, en caso de revocar el consentimiento para el uso de la
                  identificación facial <strong>antes de la conclusión del Concurso</strong>, podría resultar imposible
                  mantener tu participación, ya que este proceso es necesario para validar tu registro único.
                </p>
                <p className="mt-3">
                  Para ejercer tus derechos ARCO o la revocación de tu consentimiento, puedes enviar una solicitud al
                  correo:
                </p>
                <ul className="list-disc pl-6">
                  <li>
                    <a href="mailto:contacto@mctree.com.mx" className="text-primary hover:underline">
                      contacto@mctree.com.mx
                    </a>
                  </li>
                </ul>
                <p className="mt-3">
                  La solicitud deberá contener, al menos: tu nombre completo, medio de contacto para darte respuesta,
                  una descripción clara de los datos respecto de los cuales buscas ejercer derechos, y cualquier
                  elemento que facilite la localización de tu información.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">8. Aceptación del Aviso de Privacidad</h3>
                <p>
                  Al registrarte y participar en el Concurso <strong>"Convención Nacional SAHUAYO 2025"</strong> a
                  través de la <strong>app Recompensas Herdez</strong>, y al completar el proceso de identificación
                  facial, manifiestas que:
                </p>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>Has leído y entendido el contenido de este Aviso de Privacidad.</li>
                  <li>
                    Aceptas el tratamiento de tus datos personales y biométricos para las finalidades aquí descritas.
                  </li>
                  <li>
                    Comprendes que la identificación facial se utiliza exclusivamente para fines de registro,
                    verificación de identidad y control del Concurso, y que tus datos biométricos serán eliminados una
                    vez concluida la vigencia y periodo de aclaraciones del Concurso.
                  </li>
                </ol>

                <h3 className="text-xl font-semibold mt-6 mb-3">9. Cambios al Aviso de Privacidad</h3>
                <p>
                  El Responsable podrá modificar o actualizar en cualquier momento el presente Aviso de Privacidad para
                  reflejar cambios en la normativa aplicable, en los procesos internos o por nuevas finalidades
                  relacionadas con el Concurso.
                </p>
                <p className="mt-3">
                  Cualquier cambio sustancial será comunicado a través de los mismos medios por los que se haya hecho
                  disponible este Aviso (por ejemplo, dentro de la app Recompensas Herdez o en los canales oficiales
                  del Concurso).
                </p>
                <p className="mt-3">
                  En caso de existir cambios que requieran tu consentimiento, te serán informados para que puedas
                  manifestar, en su caso, tu aceptación.
                </p>

                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-center">
                    Última actualización: Noviembre 2025
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
