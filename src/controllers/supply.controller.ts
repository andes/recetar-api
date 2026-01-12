import { Request, Response } from 'express';
import Supply from '../models/supply.model';
import ISupply from '../interfaces/supply.interface';
import { BaseController } from '../interfaces/classes/base-controllers.interface';

class SupplyController implements BaseController {

    public index = async (req: Request, res: Response): Promise<Response> => {
        const supplies: ISupply[] = await Supply.find();
        return res.status(200).json({ supplies });
    };

    public create = async (req: Request, res: Response): Promise<Response> => {
        const {
            name,
            activePrinciple,
            power,
            unity,
            firstPresentation,
            secondPresentation,
            description,
            observation,
            pharmaceutical_form
        } = req.body;
        const newSupply: ISupply = new Supply({
            name,
            activePrinciple,
            power,
            unity,
            firstPresentation,
            secondPresentation,
            description,
            observation,
            pharmaceutical_form
        });
        try {
            await newSupply.save();
            return res.status(200).json({ newSupply });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public show = async (req: Request, res: Response): Promise<Response> => {
        try {
            const id: string = req.params.id;
            const supply: ISupply | null = await Supply.findOne({ _id: id });
            return res.status(200).json(supply);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        // "name", "activePrinciple", "pharmaceutical_form", "power", "unity", "firstPresentation", "secondPresentation", "description", "observation"
        // son los campos que permitiremos actualizar.
        const { id } = req.params;
        const values: any = {};
        try {
            if (typeof req.body.name !== 'undefined') { values.name = req.body.name; }
            if (typeof req.body.activePrinciple !== 'undefined') { values.activePrinciple = req.body.activePrinciple; }
            if (typeof req.body.pharmaceutical_form !== 'undefined') { values.pharmaceutical_form = req.body.pharmaceutical_form; }
            if (typeof req.body.power !== 'undefined') { values.power = req.body.power; }
            if (typeof req.body.unity !== 'undefined') { values.unity = req.body.unity; }
            if (typeof req.body.firstPresentation !== 'undefined') { values.firstPresentation = req.body.firstPresentation; }
            if (typeof req.body.secondPresentation !== 'undefined') { values.secondPresentation = req.body.secondPresentation; }
            if (typeof req.body.description !== 'undefined') { values.description = req.body.description; }
            if (typeof req.body.observation !== 'undefined') { values.observation = req.body.observation; }
            const opts: any = { runValidators: true, new: true };
            const supply: ISupply | null = await Supply.findOneAndUpdate({ _id: id }, values, opts);

            return res.status(200).json(supply);
        } catch (e) {
            // formateamos los errores de validacion
            if (e.name !== 'undefined' && e.name === 'ValidationError') {
                const errors: { [key: string]: string } = {};
                Object.keys(e.errors).forEach(prop => {
                    errors[prop] = e.errors[prop].message;
                });
                return res.status(422).json(errors);
            }
            // eslint-disable-next-line no-console
            console.log(e);
            return res.status(500).json('Server Error');
        }
    };

    public delete = async (req: Request, res: Response): Promise<Response> => {
        try {

            const { id } = req.params;
            await Supply.findByIdAndDelete(id);
            return res.status(200).json('deleted');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public getByName = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { supplyName } = req.query;
            let target: string = decodeURIComponent(supplyName);
            target = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            let search = '';
            let supplies: ISupply[];
            // first word should apper in all coincidence
            const words = target.split(' ');
            if (words.length > 1) {
                // find by multiple words
                for (let i = 0; i < words.length; i++) {
                    search += '\"' + words[i].trim() + '\"' + ' ';
                }
                supplies = await Supply.find({ $text: { $search: search } }).select('name').limit(20);
            } else {
                // find by regex with the first word
                supplies = await Supply.find({ name: { $regex: new RegExp(target, 'ig') } }).select('name').limit(20);
            }

            return res.status(200).json(supplies);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

    public get = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { supplyName } = req.query;
            let target: string = decodeURIComponent(supplyName);
            target = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            let search = '';
            let supplies: ISupply[];
            // first word should apper in all coincidence
            const words = target.split(' ');
            if (words.length > 1) {
                // find by multiple words
                for (let i = 0; i < words.length; i++) {
                    search += '\"' + words[i].trim() + '\"' + ' ';
                }
                supplies = await Supply.find({ $text: { $search: search } }).limit(20);
            } else {
                // find by regex with the first word
                supplies = await Supply.find({ name: { $regex: new RegExp(target, 'ig') } }).limit(20);
            }

            return res.status(200).json(supplies);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            return res.status(500).json('Server Error');
        }
    };

}

export default new SupplyController();
