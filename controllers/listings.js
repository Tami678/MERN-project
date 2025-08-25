const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

/*module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};*/

/*module.exports.index = async (req, res) => {
  const { city, category } = req.query;  // 👈 pick city from query

  let filter = {};

  if (category) {
    filter.category = category;
  }

  if (city) {
    // Case-insensitive search on "location" field (or "city" if you have a separate field)
    filter.location = { $regex: city, $options: "i" };
  }

  const listings = await Listing.find(filter);

  res.render("listings/index", { 
    allListings: listings, 
    category, 
    search: city || ""   // 👈 pass search back to navbar
  });
};*/
module.exports.index = async (req, res) => {
  const { city, category } = req.query;
  let filter = {};

  // category filter
  if (category) {
    filter.category = category;
  }

  // city filter (case-insensitive search on location field)
  if (city) {
    filter.location = { $regex: city, $options: "i" };
  }

  try {
    const listings = await Listing.find(filter);
    res.render("listings/index", { 
      listings, 
      category: category || "", 
      search: city || "" 
    });
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).send("Something went wrong while fetching listings.");
  }
};


module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};
module.exports.showListing = async(req,res,next)=>{
        let{id}=req.params;
        const listing= await Listing.findById(id)
            .populate({
                path:"reviews",
                populate: {
                    path: "author",
                },
            })        
            .populate("owner");
        if(!listing){
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }  
        console.log(listing);  
        res.render("listings/show.ejs",{
            listing,
            mapToken: process.env.MAP_TOKEN
        });
};
module.exports.createListing = async(req,res,next)=> { 
    let response=await geocodingClient
        .forwardGeocode({
            query: req.body.listing.location,
            limit: 1,
       })
        .send();
    
    let url=req.file.path;
    let filename=req.file.filename;
    const newListing =new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    newListing.geometry = response.body.features[0].geometry;

    let savedListing= await newListing.save();
    console.log(savedListing);
    req.flash("success", "Successfully created a new listing!");
    res.redirect("/listings");
};
/*module.exports.createNewListing = async (req, res, next) => {
    let location = `${req.body.listing.location}, ${req.body.listing.country}`;
    let response = await geocodingClient.forwardGeocode({
        query: location,
        limit: 1
    }).send();

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    
    if (req.file) {
        newListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    newListing.geometry = response.body.features[0].geometry;
    
    await newListing.save();
    req.flash("success", "New listing Created.");
    res.redirect("/listings");
}*/
module.exports.renderEditForm = async(req,res)=>{
    let{id}=req.params;
    const listing= await Listing.findById(id);
    if(!listing){
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    } 
    let originalImageUrl= listing.image.url; 
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_300,w_250");
    res.render("listings/edit.ejs",{listing, originalImageUrl});
};
/*module.exports.updateListing =async(req,res)=>{ 

    let {id} =req.params;
    let listing=await Listing.findByIdAndUpdate(id,{...req.body.listing});

    if(typeof req.file !== "undefined") {
    let url=req.file.path;
    let filename=req.file.filename;
    listing.image = { url, filename };
    await listing.save();
    }
    req.flash("success", "Successfully updated the listing!");
    return res.redirect(`/listings/${id}`);
};*/
module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    // re-geocode new location if updated
    let response = await geocodingClient
        .forwardGeocode({
            query: req.body.listing.location,
            limit: 1,
        })
        .send();

    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    // update geometry with new coordinates
    listing.geometry = response.body.features[0].geometry;

    // update image if new one uploaded
    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
    }

    await listing.save();

    req.flash("success", "Successfully updated the listing!");
    return res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async(req,res)=>{
    let {id}=req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "deleted the listing!");
    res.redirect("/listings");
};
