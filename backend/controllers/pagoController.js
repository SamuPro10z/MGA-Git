const Pago = require('../models/Pago');
const Cliente = require('../models/Cliente');

const pagoController = {
  async getPagos(req, res) {
    try {
      // Verificar si se está filtrando por cliente
      const { clienteId, documento } = req.query;
      let query = {};
      
      // Si se proporciona clienteId o documento, filtrar por ese cliente
      if (clienteId || documento) {
        // Si tenemos documento pero no clienteId, primero buscar el cliente
        if (documento && !clienteId) {
          try {
            const Cliente = require('../models/Cliente');
            const cliente = await Cliente.findOne({ numeroDocumento: documento });
            if (cliente) {
              // Si encontramos el cliente, usar su ID para filtrar
              query = { 'ventas.beneficiarioId.clienteId': cliente._id };
            } else {
              // Si no encontramos el cliente, devolver array vacío
              return res.json({
                success: true,
                data: [],
                total: 0,
                message: 'No se encontró cliente con ese documento'
              });
            }
          } catch (error) {
            console.error('Error buscando cliente por documento:', error);
          }
        } else if (clienteId) {
          // Si tenemos clienteId, filtrar directamente
          query = { 'ventas.beneficiarioId.clienteId': clienteId };
        }
      }
      
      const pagos = await Pago.find(query)
        .populate({
          path: 'ventas',
          populate: [{
            path: 'beneficiarioId',
            model: 'Beneficiario'
          }]
        })
        .sort({ createdAt: -1 });

      const pagosFormateados = await Promise.all(pagos.map(async (pago) => {
        const pagoObj = pago.toObject();
        
        // Buscar información del cliente si existe clienteId
        let clienteInfo = null;
        if (pagoObj.ventas?.beneficiarioId?.clienteId) {
          const beneficiario = pagoObj.ventas.beneficiarioId;
          
          // Si el clienteId es igual al _id del beneficiario, duplicar la información
          if (beneficiario.clienteId === beneficiario._id.toString()) {
            clienteInfo = {
              _id: beneficiario._id,
              nombre: beneficiario.nombre,
              apellido: beneficiario.apellido,
              tipoDocumento: beneficiario.tipo_de_documento,
              numeroDocumento: beneficiario.numero_de_documento,
              telefono: beneficiario.telefono,
              correo: beneficiario.email || beneficiario.correo || '',
              direccion: beneficiario.direccion,
              fechaNacimiento: beneficiario.fechaDeNacimiento,
              estado: true
            };
          } else {
            // Si son diferentes, buscar la información real del cliente
            try {
              // Primero intentar buscar en la colección de clientes
              const cliente = await Cliente.findById(beneficiario.clienteId);
              if (cliente) {
                clienteInfo = {
                  _id: cliente._id,
                  nombre: cliente.nombre,
                  apellido: cliente.apellido,
                  tipoDocumento: cliente.tipoDocumento,
                  numeroDocumento: cliente.numeroDocumento,
                  telefono: cliente.telefono,
                  estado: cliente.estado
                };
              } else {
                // Si no se encuentra en clientes, buscar en beneficiarios
                const Beneficiario = require('../models/Beneficiario');
                const clienteBeneficiario = await Beneficiario.findById(beneficiario.clienteId);
                if (clienteBeneficiario) {
                  clienteInfo = {
                    _id: clienteBeneficiario._id,
                    nombre: clienteBeneficiario.nombre,
                    apellido: clienteBeneficiario.apellido,
                    tipoDocumento: clienteBeneficiario.tipo_de_documento,
                    numeroDocumento: clienteBeneficiario.numero_de_documento,
                    telefono: clienteBeneficiario.telefono,
                    estado: true
                  };
                } else {
                  console.log('Cliente no encontrado en ninguna colección con ID:', beneficiario.clienteId);
                }
              }
            } catch (error) {
              console.log('Error buscando cliente:', error.message);
            }
          }
        }

        return {
          _id: pagoObj._id,
          metodoPago: pagoObj.metodoPago,
          fechaPago: pagoObj.fechaPago,
          valor_total: pagoObj.valor_total,
          descripcion: pagoObj.descripcion,
          numeroTransaccion: pagoObj.numeroTransaccion,
          estado: pagoObj.estado,
          createdAt: pagoObj.createdAt,
          updatedAt: pagoObj.updatedAt,
          ventas: pagoObj.ventas ? {
            _id: pagoObj.ventas._id,
            valor_total: pagoObj.ventas.valor_total || 0,
            codigoVenta: pagoObj.ventas.codigoVenta,
            tipo: pagoObj.ventas.tipo,
            estado: pagoObj.ventas.estado,
            fechaInicio: pagoObj.ventas.fechaInicio,
            fechaFin: pagoObj.ventas.fechaFin,
            numero_de_clases: pagoObj.ventas.numero_de_clases,
            ciclo: pagoObj.ventas.ciclo,
            beneficiario: pagoObj.ventas.beneficiarioId ? {
              _id: pagoObj.ventas.beneficiarioId._id,
              nombre: pagoObj.ventas.beneficiarioId.nombre,
              apellido: pagoObj.ventas.beneficiarioId.apellido,
              tipo_de_documento: pagoObj.ventas.beneficiarioId.tipo_de_documento,
              numero_de_documento: pagoObj.ventas.beneficiarioId.numero_de_documento,
              telefono: pagoObj.ventas.beneficiarioId.telefono,
              direccion: pagoObj.ventas.beneficiarioId.direccion,
              fechaDeNacimiento: pagoObj.ventas.beneficiarioId.fechaDeNacimiento,
              clienteId: pagoObj.ventas.beneficiarioId.clienteId,
              cliente: clienteInfo
            } : null
          } : null
        };
      }));

      res.json({
        success: true,
        data: pagosFormateados,
        total: pagosFormateados.length
      });
    } catch (error) {
      console.error('Error en getPagos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los pagos',
        error: error.message
      });
    }
  },

  async getPagoById(req, res) {
    try {
      const pago = await Pago.findById(req.params.id)
        .populate({
          path: 'ventas',
          populate: [{
            path: 'beneficiarioId',
            model: 'Beneficiario'
          }]
        });

      if (!pago) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      const pagoObj = pago.toObject();
      
      // Buscar información del cliente si existe clienteId
      let clienteInfo = null;
      if (pagoObj.ventas?.beneficiarioId?.clienteId) {
        const beneficiario = pagoObj.ventas.beneficiarioId;
        
        // Si el clienteId es igual al _id del beneficiario, duplicar la información
        if (beneficiario.clienteId === beneficiario._id.toString()) {
          clienteInfo = {
            _id: beneficiario._id,
            nombre: beneficiario.nombre,
            apellido: beneficiario.apellido,
            tipoDocumento: beneficiario.tipo_de_documento,
            numeroDocumento: beneficiario.numero_de_documento,
            telefono: beneficiario.telefono,
            correo: beneficiario.email || beneficiario.correo || '',
            direccion: beneficiario.direccion,
            fechaNacimiento: beneficiario.fechaDeNacimiento,
            estado: true
          };
                 } else {
           // Si son diferentes, buscar la información real del cliente
           try {
             // Primero intentar buscar en la colección de clientes
             const cliente = await Cliente.findById(beneficiario.clienteId);
             if (cliente) {
               clienteInfo = {
                 _id: cliente._id,
                 nombre: cliente.nombre,
                 apellido: cliente.apellido,
                 tipoDocumento: cliente.tipoDocumento,
                 numeroDocumento: cliente.numeroDocumento,
                 telefono: cliente.telefono,
                 estado: cliente.estado
               };
             } else {
               // Si no se encuentra en clientes, buscar en beneficiarios
               const Beneficiario = require('../models/Beneficiario');
               const clienteBeneficiario = await Beneficiario.findById(beneficiario.clienteId);
               if (clienteBeneficiario) {
                 clienteInfo = {
                   _id: clienteBeneficiario._id,
                   nombre: clienteBeneficiario.nombre,
                   apellido: clienteBeneficiario.apellido,
                   tipoDocumento: clienteBeneficiario.tipo_de_documento,
                   numeroDocumento: clienteBeneficiario.numero_de_documento,
                   telefono: clienteBeneficiario.telefono,
                   estado: true
                 };
               } else {
                 console.log('Cliente no encontrado en ninguna colección con ID:', beneficiario.clienteId);
               }
             }
           } catch (error) {
             console.log('Error buscando cliente:', error.message);
           }
         }
      }

      res.json({
        success: true,
        data: {
          ...pagoObj,
          ventas: pagoObj.ventas ? {
            ...pagoObj.ventas,
            beneficiario: pagoObj.ventas.beneficiarioId ? {
              ...pagoObj.ventas.beneficiarioId,
              cliente: clienteInfo
            } : null
          } : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener el pago',
        error: error.message
      });
    }
  },

  async createPago(req, res) {
    try {
      // Validar que solo se incluyan los campos permitidos
      const { metodoPago, ventas, fechaPago, estado, valor_total, descripcion, numeroTransaccion } = req.body;
      const nuevoPago = new Pago({ 
        metodoPago, 
        ventas,
        fechaPago: fechaPago || new Date(),
        estado: estado || 'completado',
        valor_total,
        descripcion,
        numeroTransaccion
      });
      
      await nuevoPago.save();
      
      const pagoCompleto = await Pago.findById(nuevoPago._id)
        .populate({
          path: 'ventas',
          populate: [{
            path: 'beneficiarioId',
            model: 'Beneficiario'
          }]
        });

      res.status(201).json({
        success: true,
        data: pagoCompleto
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al crear el pago',
        error: error.message
      });
    }
  },

  async updatePago(req, res) {
    try {
      // Filtrar solo los campos permitidos para actualización
      const { metodoPago, ventas, fechaPago, estado, valor_total, descripcion, numeroTransaccion } = req.body;
      const updateData = {};
      
      if (metodoPago !== undefined) updateData.metodoPago = metodoPago;
      if (ventas !== undefined) updateData.ventas = ventas;
      if (fechaPago !== undefined) updateData.fechaPago = fechaPago;
      if (estado !== undefined) updateData.estado = estado;
      if (valor_total !== undefined) updateData.valor_total = valor_total;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (numeroTransaccion !== undefined) updateData.numeroTransaccion = numeroTransaccion;

      const pago = await Pago.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!pago) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      res.json({
        success: true,
        data: pago
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el pago',
        error: error.message
      });
    }
  },

  async deletePago(req, res) {
    try {
      const pago = await Pago.findByIdAndDelete(req.params.id);

      if (!pago) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Pago eliminado correctamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el pago',
        error: error.message
      });
    }
  },

  async debugPagos(req, res) {
    try {
      console.log('=== DEBUG PAGOS ===');
      const pagos = await Pago.find().limit(1)
        .populate({
          path: 'ventas',
          populate: [{
            path: 'beneficiarioId',
            model: 'Beneficiario'
          }]
        });

      res.json({
        success: true,
        data: pagos
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en debug de pagos',
        error: error.message
      });
    }
  },

  async debugCliente(req, res) {
    try {
      console.log('=== DEBUG CLIENTE ===');
      const { clienteId } = req.params;
      
      console.log('Buscando cliente con ID:', clienteId);
      
      // Verificar si el ID es válido
      const mongoose = require('mongoose');
      const isValidId = mongoose.Types.ObjectId.isValid(clienteId);
      console.log('¿Es un ObjectId válido?:', isValidId);
      
      // Intentar buscar el cliente
      const cliente = await Cliente.findById(clienteId);
      
      if (cliente) {
        console.log('Cliente encontrado:', cliente);
        res.json({
          success: true,
          data: cliente
        });
      } else {
        console.log('Cliente no encontrado');
        
        // Intentar buscar por otros campos
        const clientePorDocumento = await Cliente.findOne({ numeroDocumento: clienteId });
        const clientePorNombre = await Cliente.findOne({ nombre: clienteId });
        
        // Obtener todos los clientes para ver qué hay en la base de datos
        const todosLosClientes = await Cliente.find().limit(5);
        
        // Buscar en beneficiarios para ver si el clienteId corresponde a un beneficiario
        const Beneficiario = require('../models/Beneficiario');
        const beneficiarioConClienteId = await Beneficiario.findOne({ _id: clienteId });
        const beneficiarioPorClienteId = await Beneficiario.findOne({ clienteId: clienteId });
        
        res.json({
          success: false,
          message: 'Cliente no encontrado',
          debug: {
            clienteId,
            isValidObjectId: isValidId,
            clientePorDocumento: clientePorDocumento ? 'Encontrado por documento' : 'No encontrado',
            clientePorNombre: clientePorNombre ? 'Encontrado por nombre' : 'No encontrado',
            totalClientes: await Cliente.countDocuments(),
            primerosClientes: todosLosClientes.map(c => ({
              _id: c._id,
              nombre: c.nombre,
              apellido: c.apellido,
              numeroDocumento: c.numeroDocumento
            })),
            beneficiarioConClienteId: beneficiarioConClienteId ? {
              _id: beneficiarioConClienteId._id,
              nombre: beneficiarioConClienteId.nombre,
              apellido: beneficiarioConClienteId.apellido,
              numero_de_documento: beneficiarioConClienteId.numero_de_documento,
              clienteId: beneficiarioConClienteId.clienteId
            } : 'No encontrado',
            beneficiarioPorClienteId: beneficiarioPorClienteId ? {
              _id: beneficiarioPorClienteId._id,
              nombre: beneficiarioPorClienteId.nombre,
              apellido: beneficiarioPorClienteId.apellido,
              numero_de_documento: beneficiarioPorClienteId.numero_de_documento,
              clienteId: beneficiarioPorClienteId.clienteId
            } : 'No encontrado'
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en debug de cliente',
        error: error.message
      });
    }
  }
};

module.exports = pagoController;