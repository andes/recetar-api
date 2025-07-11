import mongoose from 'mongoose';
import { env } from '../../config/config';
import User from '../../models/user.model';
import Prescription from '../../models/prescription.model';
import Role from '../../models/role.model';



const initializeMongo = (): void => {
  const MONGO_URI = `${(process.env.MONGODB_URI || env.MONGODB_CONNECTION)}`;
  mongoose.Promise = Promise;
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  }).then( mongoose => {
    console.log('DB is connected');
    userCleaning().then(() => {
      mongoose.disconnect();
    });
  });
}

async function userCleaning(){
  console.log(">> INICIANDO PROCESO DE LIMPIEZA DE USUARIOS...");
  try{
    const users = await findProfessionals();
    
    console.log(`>> CANTIDAD DE USUARIOS PROFESIONALES SIN PRESCRIPCIONES: ${users.length}`);
    

    console.log(`>> CANTIDAD DE USUARIOS QUE DEBEN SER LIMPIADOS: ${users.length}`);
    console.log(`>> COMENZANDO LIMPIEZA...`);

    if (users) {
      for (const user of users) {
        console.log(`>> ELIMINANDO USUARIO: ${user._id}`);
        await User.deleteOne({ _id: user._id });
      }
    }else{
      console.log(">> NO SE ENCONTRARON USUARIOS PARA LIMPIAR");
    }
    console.log('>> FIN PROCESO =================');
    
  }catch(err){
    console.log("UN ERROR OCURRIÓ");
    console.log(err)
  }
}

async function findProfessionals() {
  try {
    const professionalRole = await Role.findOne({ role: /professional/i });
    
    if (!professionalRole) {
      console.log(">> No se encontró el rol 'Profesional'");
      return [];
    }

    console.log(`>> Rol profesional encontrado: ${professionalRole._id}`);

    const pipeline = [
      {
        $match: {
          roles: professionalRole._id,
          createdAt: { $lt: new Date("2025-01-01") }
        }
      },
      {
        $lookup: {
          from: 'prescriptions',
          localField: '_id',
          foreignField: 'professional.userId',
          as: 'prescriptions'
        }
      },
      {
        $match: {
          prescriptions: { $size: 0 }
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          businessName: 1,
          createdAt: 1,
          prescriptionsCount: { $size: "$prescriptions" }
        }
      }
    ];

    const result = await User.aggregate(pipeline);
    
    console.log(">> USUARIOS PROFESIONALES SIN PRESCRIPCIONES:");
    result.forEach(user => {
      console.log(`   - ID: ${user._id}, Username: ${user.username}, Email: ${user.email}, BusinessName: ${user.businessName}`);
    });

    return result;
    
  } catch (error) {
    console.error("Error en findProfessionalsWithoutPrescriptions:", error);
    return [];
  }
}


initializeMongo();
