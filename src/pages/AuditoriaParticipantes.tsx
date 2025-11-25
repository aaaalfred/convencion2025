import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Trophy, Target, Award, Search, Eye, Calendar, TrendingUp, CheckCircle, XCircle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api-config';

interface Usuario {
  id: number;
  nombre: string;
  email: string | null;
  numeroEmpleado: string | null;
  totalPuntos: number;
  fechaRegistro: string;
  esAcompanante: boolean;
  totalConcursos: number;
  totalTrivias: number;
}

interface HistorialItem {
  id: number;
  evento: string;
  codigo: string;
  puntos: number;
  tipo: 'concurso' | 'trivia';
  esCorrecta?: boolean;
  fecha: string;
  hora: string;
}

interface UsuarioDetalle {
  usuario: {
    id: number;
    nombre: string;
    email: string | null;
    numeroEmpleado: string | null;
    totalPuntos: number;
    fechaRegistro: string;
    esAcompanante: boolean;
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

export default function AuditoriaParticipantes() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Cargar usuarios
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const response = await fetch(apiUrl('/api/auditoria/usuarios'));
        const data = await response.json();

        if (data.success) {
          setUsuarios(data.data);
          setFilteredUsuarios(data.data);
        } else {
          toast.error('Error al cargar usuarios');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    cargarUsuarios();
  }, []);

  // Filtrar usuarios
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsuarios(usuarios);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = usuarios.filter(u =>
      u.nombre.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.numeroEmpleado && u.numeroEmpleado.toLowerCase().includes(term))
    );
    setFilteredUsuarios(filtered);
  }, [searchTerm, usuarios]);

  // Ver detalle de usuario
  const verDetalle = async (usuarioId: number) => {
    setLoadingDetalle(true);
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
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar el historial');
      setDialogOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calcular totales
  const totalPuntosGeneral = usuarios.reduce((sum, u) => sum + u.totalPuntos, 0);
  const totalParticipaciones = usuarios.reduce((sum, u) => sum + u.totalConcursos + u.totalTrivias, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Auditoría de Participantes" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Header con estadísticas */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Panel de Auditoría
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Consulta de puntos y participaciones por usuario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/10 rounded-lg">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <div className="text-3xl font-bold">{usuarios.length}</div>
                    <div className="text-sm text-slate-300">Usuarios</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 rounded-lg">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                    <div className="text-3xl font-bold">{totalPuntosGeneral.toLocaleString()}</div>
                    <div className="text-sm text-slate-300">Puntos Totales</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 rounded-lg">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <div className="text-3xl font-bold">{totalParticipaciones}</div>
                    <div className="text-sm text-slate-300">Participaciones</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/resultados')}
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    Ver Resultados por Concurso/Trivia
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Buscador */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, email o número de empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchTerm && (
                  <p className="text-sm text-gray-500 mt-2">
                    Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tabla de usuarios */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando participantes...</p>
                  </div>
                ) : filteredUsuarios.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Participante</TableHead>
                        <TableHead>No. Empleado</TableHead>
                        <TableHead className="text-center">Concursos</TableHead>
                        <TableHead className="text-center">Trivias</TableHead>
                        <TableHead className="text-right">Puntos</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsuarios.map((usuario, index) => (
                        <TableRow key={usuario.id}>
                          <TableCell>
                            {index < 3 ? (
                              <Trophy className={`w-5 h-5 ${
                                index === 0 ? 'text-yellow-500' :
                                index === 1 ? 'text-gray-400' : 'text-orange-500'
                              }`} />
                            ) : (
                              <span className="text-gray-500">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {usuario.nombre}
                                {usuario.esAcompanante && (
                                  <Badge variant="outline" className="text-xs">Acompañante</Badge>
                                )}
                              </div>
                              {usuario.email && (
                                <div className="text-sm text-gray-500">{usuario.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {usuario.numeroEmpleado ? (
                              <Badge variant="outline">{usuario.numeroEmpleado}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Target className="w-4 h-4 text-blue-500" />
                              <span>{usuario.totalConcursos}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-purple-500" />
                              <span>{usuario.totalTrivias}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-green-600 text-lg">
                              {usuario.totalPuntos.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => verDetalle(usuario.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No se encontraron usuarios</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Historial de Participaciones
            </DialogTitle>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          ) : selectedUsuario && (
            <div className="space-y-6">
              {/* Info del usuario */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg">{selectedUsuario.usuario.nombre}</h3>
                {selectedUsuario.usuario.email && (
                  <p className="text-gray-600">{selectedUsuario.usuario.email}</p>
                )}
                {selectedUsuario.usuario.numeroEmpleado && (
                  <p className="text-sm text-gray-500">
                    Empleado: {selectedUsuario.usuario.numeroEmpleado}
                  </p>
                )}
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  Registrado: {formatDate(selectedUsuario.usuario.fechaRegistro)}
                </p>
              </div>

              {/* Resumen de puntos */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedUsuario.resumen.totalPuntos.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Puntos Totales</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedUsuario.resumen.puntosConcursos.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">
                    De {selectedUsuario.resumen.totalConcursos} concursos
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedUsuario.resumen.puntosTrivias.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-700">
                    De {selectedUsuario.resumen.totalTrivias} trivias
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
