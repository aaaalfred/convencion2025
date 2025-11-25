import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Calendar, Award, Target, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api-config';

interface Concurso {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  puntos_otorgados: number;
  participacion_unica: number;
  activo: number;
  total_participaciones: number;
  puntos_totales_otorgados: number | null;
}

interface Trivia {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  puntos_maximos: number;
  puntos_minimos: number;
  activo: number;
  total_participaciones: number;
  puntos_totales_otorgados: number | null;
  estado: 'proxima' | 'activa' | 'finalizada';
}

interface Participante {
  posicion: number;
  id: number;
  usuarioId: number;
  nombre: string;
  puntos: number;
  fecha: string;
  hora: string;
  esCorrecta?: boolean;
}

interface ConcursoDetalle {
  concurso: {
    id: number;
    nombre: string;
    codigo: string;
    puntosOtorgados: number;
    participacionUnica: boolean;
  };
  participantes: Participante[];
  totalParticipantes: number;
}

interface TriviaDetalle {
  trivia: {
    id: number;
    nombre: string;
    descripcion: string | null;
    fechaInicio: string;
    fechaFin: string;
    puntosMaximos: number;
    puntosMinimos: number;
  };
  participantes: Participante[];
  totalParticipantes: number;
  respuestasCorrectas: number;
}

export default function ResultadosConcursos() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<'concursos' | 'trivias'>('concursos');
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [trivias, setTrivias] = useState<Trivia[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [concursoDetalle, setConcursoDetalle] = useState<ConcursoDetalle | null>(null);
  const [triviaDetalle, setTriviaDetalle] = useState<TriviaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Cargar listas de concursos y trivias
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resConcursos, resTrivias] = await Promise.all([
          fetch(apiUrl('/api/concursos')),
          fetch(apiUrl('/api/trivias'))
        ]);

        const dataConcursos = await resConcursos.json();
        const dataTrivias = await resTrivias.json();

        if (dataConcursos.success) {
          setConcursos(dataConcursos.data);
        }
        if (dataTrivias.success) {
          setTrivias(dataTrivias.data);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Cargar detalle cuando se selecciona un concurso/trivia
  useEffect(() => {
    if (!selectedId) {
      setConcursoDetalle(null);
      setTriviaDetalle(null);
      return;
    }

    const cargarDetalle = async () => {
      setLoadingDetalle(true);
      try {
        const endpoint = tipo === 'concursos'
          ? `/api/concursos/${selectedId}/participantes`
          : `/api/trivias/${selectedId}/participantes`;

        const response = await fetch(apiUrl(endpoint));
        const data = await response.json();

        if (data.success) {
          if (tipo === 'concursos') {
            setConcursoDetalle(data.data);
            setTriviaDetalle(null);
          } else {
            setTriviaDetalle(data.data);
            setConcursoDetalle(null);
          }
        } else {
          toast.error(data.error || 'Error al cargar detalles');
        }
      } catch (error) {
        console.error('Error cargando detalle:', error);
        toast.error('Error al cargar los detalles');
      } finally {
        setLoadingDetalle(false);
      }
    };

    cargarDetalle();
  }, [selectedId, tipo]);

  // Reset selection when changing type
  const handleTipoChange = (newTipo: string) => {
    setTipo(newTipo as 'concursos' | 'trivias');
    setSelectedId('');
    setConcursoDetalle(null);
    setTriviaDetalle(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge className="bg-green-500">Activa</Badge>;
      case 'finalizada':
        return <Badge variant="secondary">Finalizada</Badge>;
      case 'proxima':
        return <Badge className="bg-blue-500">Próxima</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Resultados" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Resultados por Concurso/Trivia
                </CardTitle>
                <CardDescription>
                  Consulta los ganadores y participantes de cada evento
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  onClick={() => navigate('/auditoria')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Ver Puntos por Participante
                </Button>
              </CardContent>
            </Card>

            {/* Filtros */}
            <Card>
              <CardContent className="pt-6">
                <Tabs value={tipo} onValueChange={handleTipoChange}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="concursos" className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Concursos ({concursos.length})
                    </TabsTrigger>
                    <TabsTrigger value="trivias" className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Trivias ({trivias.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="concursos">
                    <Select value={selectedId} onValueChange={setSelectedId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un concurso..." />
                      </SelectTrigger>
                      <SelectContent>
                        {concursos.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{c.nombre}</span>
                              <Badge variant="outline" className="text-xs">{c.codigo}</Badge>
                              <span className="text-gray-500 text-xs">
                                ({c.total_participaciones} participantes)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>

                  <TabsContent value="trivias">
                    <Select value={selectedId} onValueChange={setSelectedId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una trivia..." />
                      </SelectTrigger>
                      <SelectContent>
                        {trivias.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{t.nombre}</span>
                              {getEstadoBadge(t.estado)}
                              <span className="text-gray-500 text-xs">
                                ({t.total_participaciones} participantes)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Loading */}
            {loadingDetalle && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando participantes...</p>
                </CardContent>
              </Card>
            )}

            {/* Detalle de Concurso */}
            {concursoDetalle && !loadingDetalle && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        {concursoDetalle.concurso.nombre}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Código: {concursoDetalle.concurso.codigo} |
                        Puntos: {concursoDetalle.concurso.puntosOtorgados} |
                        {concursoDetalle.concurso.participacionUnica ? ' Participación única' : ' Participación múltiple'}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                        <Users className="w-6 h-6" />
                        {concursoDetalle.totalParticipantes}
                      </div>
                      <p className="text-sm text-gray-500">participantes</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {concursoDetalle.participantes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Participante</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Puntos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {concursoDetalle.participantes.map((p) => (
                          <TableRow key={p.id} className={p.posicion === 1 ? 'bg-yellow-50' : ''}>
                            <TableCell>
                              {p.posicion === 1 ? (
                                <Trophy className="w-5 h-5 text-yellow-500" />
                              ) : (
                                <span className="text-gray-500">{p.posicion}</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{p.nombre}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {p.fecha} {p.hora}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600">+{p.puntos}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Aún no hay participantes en este concurso</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Detalle de Trivia */}
            {triviaDetalle && !loadingDetalle && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        {triviaDetalle.trivia.nombre}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {triviaDetalle.trivia.descripcion}
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(triviaDetalle.trivia.fechaInicio)}
                        </span>
                        <span>→</span>
                        <span>{formatDate(triviaDetalle.trivia.fechaFin)}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 text-xl font-bold text-primary">
                        <Users className="w-5 h-5" />
                        {triviaDetalle.totalParticipantes}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {triviaDetalle.respuestasCorrectas} correctas
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg text-sm">
                    <p>
                      <strong>Puntaje:</strong> {triviaDetalle.trivia.puntosMaximos} pts (máx) →{' '}
                      {triviaDetalle.trivia.puntosMinimos} pts (mín)
                    </p>
                  </div>

                  {triviaDetalle.participantes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Participante</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Puntos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {triviaDetalle.participantes.map((p) => (
                          <TableRow
                            key={p.id}
                            className={p.posicion === 1 && p.esCorrecta ? 'bg-yellow-50' : ''}
                          >
                            <TableCell>
                              {p.posicion === 1 && p.esCorrecta ? (
                                <Trophy className="w-5 h-5 text-yellow-500" />
                              ) : (
                                <span className="text-gray-500">{p.posicion}</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{p.nombre}</TableCell>
                            <TableCell>
                              {p.esCorrecta ? (
                                <Badge className="bg-green-500">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Correcta
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Incorrecta
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {p.fecha} {p.hora}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-semibold ${p.esCorrecta ? 'text-green-600' : 'text-gray-400'}`}>
                                {p.esCorrecta ? `+${p.puntos}` : '0'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Aún no hay participantes en esta trivia</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mensaje cuando no hay selección */}
            {!selectedId && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    Selecciona un concurso o trivia para ver sus participantes
                  </p>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
