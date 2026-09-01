const vehicleService = require('../services/vehicle.service');

async function listMine(req, res, next) {
  try {
    const vehicles = await vehicleService.listMyVehicles(req.user.userId);
    res.status(200).json({ success: true, data: vehicles });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const vehicle = await vehicleService.getOwnedVehicle(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const vehicle = await vehicleService.createVehicle(req.user.userId, req.body);
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const vehicle = await vehicleService.updateVehicle(req.params.id, req.user.userId, req.body);
    res.status(200).json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await vehicleService.deleteVehicle(req.params.id, req.user.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, getOne, create, update, remove };
