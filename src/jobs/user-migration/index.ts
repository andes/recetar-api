import mongoose from 'mongoose';
import { env } from '../../config/config';
import IUserOld from './user-deprecated.interface';
import { UserClass } from './user.class';



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
    userMigration().then(() => {
      mongoose.disconnect();
    });
  });
}

async function userMigration(){
  console.log(">> INICIANDO PROCESO DE ACTUALIZACIÓN...");
  const userClass = new UserClass();

  try{
    const usersDeprecated: IUserOld[] = await userClass.getUsers();

    console.log(`>> CANTIDAD DE USUARIOS QUE DEBEN SER ACTUALIZADOS: ${usersDeprecated.length}`);
    console.log(`>> COMENZANDO ACTUALIZACIÓN...`);

    if (usersDeprecated) {
      await userClass.updateNewFields(usersDeprecated);
    }else{
      console.log(">> NO SE ENCONTRARON USUARIOS PARA ACTUALIZAR");
    }
    console.log('>> FIN PROCESO =================');
  }catch(err){
    console.log("UN ERROR OCURRIÓ");
    console.log(err)
  }
}

initializeMongo();
