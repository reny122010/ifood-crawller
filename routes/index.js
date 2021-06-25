const express = require('express');
const axios = require('axios');
const router = express.Router();
const ObjectsToCsv = require('objects-to-csv')

var cheerio = require('cheerio');

const ifoodUrl = "https://marketplace.ifood.com.br/v2/merchants?&channel=IFOOD&size=30&features=&categories=&payment_types=&delivery_fee_from=0&delivery_fee_to=25&delivery_time_from=0&delivery_time_to=240"
const ifoodUrlDelivery = "https://www.ifood.com.br/delivery/";

/* GET home page. */
router.get('/', async function(req, res) {
  var page = 0;
  var pageTotal = 0;
  var stores = [];
  var promises = [];
  const DEBUG = true;
  console.log(`${ifoodUrl}&page=${page}&latitude=${req.query.latitude}&longitude=${req.query.longitude}`)

  do {
    var { data } = await axios.get(`${ifoodUrl}&page=${page}&latitude=${req.query.latitude}&longitude=${req.query.longitude}`);

    if (pageTotal === 0) {
      pageTotal = parseInt(data.total/data.size);
    }
    page++;
    console.log(page, pageTotal)
    

    promises.push(data.merchants.map(async (store) => {
      var dataHtml = { data } = await axios.get(`${ifoodUrlDelivery}/${store.slug}/${store.id}`);
      var $ = cheerio.load(dataHtml.data)
      var restaurantDetails = await JSON.parse($('#__NEXT_DATA__').html()).props.initialState.restaurant.details;

      const [deliveryMethods] = store.deliveryMethods.filter(method => method.id == 'DEFAULT');
      
      stores.push({
        id: store.id,
        name: store.name,
        slug: store.slug,
        segmnet: store.mainCategory.name,
        deliveryMinTime: deliveryMethods.minTime,
        deliveryMaxTime: deliveryMethods.maxTime,
        priceRange: restaurantDetails.priceRange,
        userRating: store.userRating,
        userRatingCount: restaurantDetails.userRatingCount,
        minimumOrderValue: store.minimumOrderValue,
        distance: store.distance,
        deliveryTime: store.deliveryTime,
        district: restaurantDetails.address.district,
        city: restaurantDetails.address.city,
        state: restaurantDetails.address.state,
        country: restaurantDetails.address.country,
        latitude: restaurantDetails.address.latitude,
        longitude: restaurantDetails.address.longitude,
        timezone: restaurantDetails.address.timezone,
        zipCode: restaurantDetails.address.zipCode,
        streetName: restaurantDetails.address.streetName,
        streetNumber: restaurantDetails.address.streetNumber,
        cnpj: restaurantDetails.documents.CNPJ.value,
      });
    }));
  } while (page < pageTotal);
  
  await Promise.all(promises);

  const csv = new ObjectsToCsv(stores);
  var fileName = `${req.query.latitude}X${req.query.longitude}.csv`;
  await csv.toDisk(`./${fileName}`);

  res.header('Content-Type', 'text/csv');
  res.attachment(fileName);
  res.sendFile(`./${fileName}`, { root: __dirname + '/..' });
});

module.exports = router;
