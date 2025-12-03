import { useState, useEffect } from 'react';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, Users, TrendingUp, Clock, Eye, Target, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api-config';

interface RankingUsuario {
  posicion: number;
  id: number;
  nombre: string;
  puntos: number;
  totalConcursos: number;
  totalTrivias: number;
  fechaRegistro: string;
  acompanante: {
    id: number;
    nombre: string;
    concursos: number;
    trivias: number;
  } | null;
}

interface HistorialItem {
  id: number;
  evento: string;
  codigo: string;
  puntos: number;
  tipo: 'concurso' | 'trivia';
  esCorrecta?: boolean;
  esAcompanante?: boolean;
  nombreParticipante?: string;
  fecha: string;
  hora: string;
}

interface UsuarioDetalle {
  usuario: {
    id: number;
    nombre: string;
    totalPuntos: number;
  };
  resumen: {
    totalPuntos: number;
    puntosConcursos: number;
    puntosTrivias: number;
    totalConcursos: number;
    totalTrivias: number;
  };
  historial: HistorialItem[];
}

interface Estadisticas {
  totalUsuarios: number;
  puntosTotales: number;
  promedioPuntos: number;
  maxPuntos: number;
}

interface RankingData {
  ranking: RankingUsuario[];
  estadisticas: Estadisticas;
  timestamp: string;
}

export default function Ranking() {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const verDetalle = async (usuarioId: number) => {
    setLoadingDetalle(true);
    setSelectedUsuario(null);
    setDialogOpen(true);

    try {
      const response = await fetch(apiUrl(`/api/auditoria/usuarios/${usuarioId}/historial`));
      const data = await response.json();

      if (data.success) {
        setSelectedUsuario(data.data);
      } else {
        toast.error(data.error || 'Error al cargar historial');
        setDialogOpen(false);
      }
    } catch {
      toast.error('Error al cargar el historial');
      setDialogOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const fetchRanking = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/ranking?limit=100'));
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        if (!silent && data) {
          toast.success('Ranking actualizado');
        }
      } else {
        throw new Error(result.error || 'Error al cargar ranking');
      }
    } catch (error) {
      console.error('Error cargando ranking:', error);
      if (!silent) {
        toast.error('Error al cargar el ranking');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar ranking inicial
  useEffect(() => {
    fetchRanking(false);
  }, []);

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRanking(true); // Silent refresh
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, data]);

  const getPodiumIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return null;
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-300';
      default:
        return 'bg-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Ranking General" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Header con estadísticas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">🏆 Ranking General</CardTitle>
                    <CardDescription>
                      Tabla de posiciones actualizada en tiempo real
                    </CardDescription>
                  </div>
                  {lastUpdate && (
                    <div className="text-right">
                      <div className="flex items-center text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3 mr-1" />
                        Última actualización
                      </div>
                      <div className="text-sm font-mono text-gray-700">
                        {formatTime(lastUpdate)}
                      </div>
                      {autoRefresh && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Auto-refresh: 10s
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              {data && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-blue-900">
                        {data.estadisticas.totalUsuarios}
                      </div>
                      <div className="text-xs text-blue-600">Usuarios</div>
                    </div>

                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-green-900">
                        {data.estadisticas.puntosTotales.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600">Puntos Totales</div>
                    </div>

                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <Trophy className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-purple-900">
                        {data.estadisticas.maxPuntos.toLocaleString()}
                      </div>
                      <div className="text-xs text-purple-600">Puntuación Máx</div>
                    </div>

                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <Award className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-orange-900">
                        {data.estadisticas.promedioPuntos.toLocaleString()}
                      </div>
                      <div className="text-xs text-orange-600">Promedio</div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Loading state */}
            {loading && !data && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando ranking...</p>
                </CardContent>
              </Card>
            )}

            {/* Ranking list */}
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle>Top {data.ranking.length} Participantes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {data.ranking.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>No hay participantes registrados todavía</p>
                        <p className="text-sm mt-2">¡Sé el primero en participar!</p>
                      </div>
                    ) : (
                      data.ranking.map((usuario) => (
                        <div
                          key={usuario.id}
                          className={`flex items-center gap-4 p-4 transition-colors hover:bg-gray-50 ${
                            usuario.posicion <= 3 ? getPodiumColor(usuario.posicion) + ' border-l-4' : ''
                          }`}
                        >
                          {/* Posición */}
                          <div className="flex-shrink-0 w-12 text-center">
                            {usuario.posicion <= 3 ? (
                              <div className="flex flex-col items-center">
                                {getPodiumIcon(usuario.posicion)}
                                <span className="text-xs font-bold mt-1">
                                  #{usuario.posicion}
                                </span>
                              </div>
                            ) : (
                              <div className="text-2xl font-bold text-gray-400">
                                {usuario.posicion}
                              </div>
                            )}
                          </div>

                          {/* Nombre */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-lg truncate flex items-center gap-2">
                              {usuario.nombre}
                              {usuario.acompanante && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                                  +1 acomp.
                                </Badge>
                              )}
                            </div>
                            {usuario.acompanante && (
                              <div className="text-xs text-orange-600">{usuario.acompanante.nombre}</div>
                            )}
                            <div className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-blue-500" />
                                {usuario.totalConcursos}
                                {usuario.acompanante && usuario.acompanante.concursos > 0 && (
                                  <span className="text-orange-600">+{usuario.acompanante.concursos}</span>
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                <Award className="w-3 h-3 text-purple-500" />
                                {usuario.totalTrivias}
                                {usuario.acompanante && usuario.acompanante.trivias > 0 && (
                                  <span className="text-orange-600">+{usuario.acompanante.trivias}</span>
                                )}
                              </span>
                              <span className="text-xs">
                                Desde {formatDate(usuario.fechaRegistro)}
                              </span>
                            </div>
                          </div>

                          {/* Puntos */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {usuario.puntos.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">puntos</div>
                          </div>

                          {/* Botón ver detalle */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => verDetalle(usuario.id)}
                            title="Ver historial"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Modal de historial */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Historial de Participaciones
            </DialogTitle>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          ) : selectedUsuario && (
            <div className="space-y-4">
              {/* Info usuario */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg">{selectedUsuario.usuario.nombre}</h3>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedUsuario.resumen.totalPuntos}
                    </div>
                    <div className="text-xs text-gray-500">Puntos Totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedUsuario.resumen.puntosConcursos}
                    </div>
                    <div className="text-xs text-gray-500">
                      De {selectedUsuario.resumen.totalConcursos} concursos
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedUsuario.resumen.puntosTrivias}
                    </div>
                    <div className="text-xs text-gray-500">
                      De {selectedUsuario.resumen.totalTrivias} trivias
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial */}
              <div>
                <h4 className="font-semibold mb-3">Detalle de Participaciones</h4>
                {selectedUsuario.historial.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Participante</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Puntos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUsuario.historial.map((item) => (
                        <TableRow key={`${item.tipo}-${item.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.evento}</div>
                              <div className="text-xs text-gray-500">{item.codigo}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className={item.esAcompanante ? 'text-orange-600' : ''}>
                                {item.nombreParticipante || selectedUsuario.usuario.nombre}
                              </span>
                              {item.esAcompanante && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                                  Acompañante
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.tipo === 'concurso' ? (
                              <Badge variant="outline" className="bg-blue-50">
                                <Target className="w-3 h-3 mr-1" />
                                Concurso
                              </Badge>
                            ) : (
                              <Badge
                                variant={item.esCorrecta ? 'default' : 'destructive'}
                                className={item.esCorrecta ? 'bg-purple-600' : ''}
                              >
                                {item.esCorrecta ? (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                ) : (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                Trivia
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {item.fecha} {item.hora}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${
                              item.puntos > 0 ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              {item.puntos > 0 ? `+${item.puntos}` : '0'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Este usuario no tiene participaciones registradas
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
