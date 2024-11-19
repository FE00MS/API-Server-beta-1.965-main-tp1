const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let pageManager;
let itemLayout;
let search = "";

let waiting = null;
let waitingGifTrigger = 2000;
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        $("#itemsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

Init_UI();



async function Init_UI() {
    itemLayout = {
        width: $("#sample").outerWidth(),
        height: $("#sample").outerHeight()
    };
    pageManager = new PageManager('scrollPanel', 'itemsPanel', itemLayout, renderNews);
    compileCategories();
    $('#createNew').on("click", async function () {
        renderCreateNewForm();
    });
    $('#abort').on("click", async function () {
        showNews()
    });
    $("#searchKey").on("change", () => {
        doSearch();
    })
    $('#doSearch').on('click', () => {
        doSearch();
    })
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    showNews();
    $("#newForm").hide();
    $("#aboutContainer").hide();
    start_Periodic_Refresh();
}
function doSearch(){
    search = $("#searchKey").val().replace(' ', ',');
    pageManager.reset();
}
function showNews() {
    $("#actionTitle").text("Actualités");
    $("#scrollPanel").show();
    $('#abort').hide();
    $('#newForm').hide();
    $('#aboutContainer').hide();
    $("#createNew").show();
    hold_Periodic_Refresh = false;
}
function hideNews() {
    $("#scrollPanel").hide();
    $("#createNew").hide();
    $("#abort").show();
    hold_Periodic_Refresh = true;
}

function start_Periodic_Refresh() {
    console.log("Periodic refresh triggered");
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await News_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                await pageManager.update(false);
                compileCategories();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}

function renderAbout() {
    hideNews();
    $("#actionTitle").text("À propos...");
    $("#aboutContainer").show();
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        showNews();
        selectedCategory = "";
        updateDropDownMenu();
        pageManager.reset();
    });
    $('.category').on("click", function () {
        showNews();
        selectedCategory = $(this).text().trim();
        updateDropDownMenu();
        pageManager.reset();
    });
}
async function compileCategories() {
    categories = [];
    let response = await News_API.GetQuery("?fields=category&sort=category");
    if (!News_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            updateDropDownMenu(categories);
        }
    }
}
async function renderNews(queryString) {
    
    if (search != "") queryString += "&keywords=" + search;
    let endOfData = false;
    queryString += "&sort=creation,desc";
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    addWaitingGif();

    let response = await News_API.Get(queryString);
    if (!News_API.error) {
        currentETag = response.ETag;
        let News = response.data;
        if (News.length > 0) {

            
            News.forEach(New => {
                $("#itemsPanel").append(renderNew(New));
            });
            $(".editCmd").off();
            $(".editCmd").on("click", function () {
                renderEditNewForm($(this).attr("editNewId"));
            });
            $(".deleteCmd").off();
            $(".deleteCmd").on("click", function () {
                renderDeleteNewForm($(this).attr("deleteNewId"));
            });
        } else
            endOfData = true;
    } else {
        renderError(News_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
(async () => {
    let etag = await News_API.HEAD();
    console.log("Fetched etag:", etag);
})();
function renderError(message) {
    hideBookmarks();
    $("#actionTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").append($(`<div>${message}</div>`));
}
function renderCreateNewForm() {
    renderNewForm();
}
async function renderEditNewForm(id) {
    addWaitingGif();
    let response = await News_API.Get(id)
    if (!News_API.error) {
        let New = response.data;
        if (New !== null)
            renderNewForm(New);
        else
            renderError("Actualité introuvable!");
    } else {
        renderError(News_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeleteNewForm(id) {
    hideNews();
    $("#actionTitle").text("Retrait");
    $('#newForm').show();
    $('#newForm').empty();
    let response = await News_API.Get(id)
    if (!News_API.error) {
        let New = response.data;
        if (New !== null) {
            $("#newForm").append(`
         <div class="NewDeleteForm text-center">
                    <h4>Confirmation de suppression</h4>
                    <p class="text-danger">
                        Êtes-vous sûr de vouloir supprimer cette actualité ?<br>
                        <strong>Cette action est irréversible !</strong>
                    </p>
                    <div class="NewRow" id="sample">
                        <div class="NewContainer noselect" style="border: 1px solid #ccc; padding: 10px; border-radius: 8px;">
                            <div class="NewLayout">
                               
                                <div class="NewTop">
                                <span class="NewCategory">${New.Category}</span>
                            <div class="NewCommandPanel">
                                <span class="editCmd cmdIcon fa fa-pencil-square" editNewId="${New.Id}"
                                    title="Modifier ${New.Title}"></span>
                                <span class="deleteCmd cmdIcon fa fa-window-close" deleteNewId="${New.Id}"
                                    title="Effacer ${New.Title}"></span>
                              </div>
                    </div>

                    <span class="NewTitle">${New.Title}</span>

                    <div class="NewImageContainer">
                        <img class="NewImage" src="${New.Image}" alt="${New.Title}" />
                    </div>
                        <span class="NewCreation">${formatDate(New.Creation)}</span>

                    <div class="NewTextContainer">
                        <span class="NewText">${New.Text}</span>
                        <button class="toggleTextButton">Afficher plus</button>
                    </div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <button id="deleteNew" class="btn btn-danger">
                            <i class="fa fa-trash"></i> Supprimer
                        </button>
                        <button id="cancel" class="btn btn-secondary">
                            <i class="fa fa-times"></i> Annuler
                        </button>
                    </div>
                </div>
        `).on('click', '.toggleTextButton', function () {
            const container = $(this).closest('.NewTextContainer');
            const textElement = container.find('.NewText');
            const button = $(this);
            
            if (container.hasClass('expanded')) {
                container.removeClass('expanded');
                textElement.css('max-height', '3em'); 
                button.text('Afficher plus');
            } else {
                container.addClass('expanded');
                textElement.css('max-height', 'none'); 
                button.text('Afficher moins');
            }
        });
            $('#deleteNew').on("click", async function () {
                await News_API.Delete(New.Id);
                if (!News_API.error) {
                    showNews();
                    await pageManager.update(false);
                    compileCategories();
                }
                else {
                    console.log(News_API.currentHttpError)
                    renderError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", function () {
                showNews();
            });

        } else {
            renderError("Actualité introuvable!");
        }
    } else
        renderError(News_API.currentHttpError);
}
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
    });
    const formattedTime = date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return `${formattedDate} - ${formattedTime}`;
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
function newNew() {
    New = {};
    New.Id = 0;
    New.Title = "";
    New.Text = "";
    New.Creation = 0;
    New.Category = "";
    return New;
}
function renderNewForm(New = null) {
    hideNews();
    let create = New == null;

    if (create){

        New = newNew();
        New.Image = "images/no-image.png";
        New.Creation = Date.now(); 
    }
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#newForm").show();
    $("#newForm").empty();
    //C
    $("#newForm").append(`
        <form class="form" id="NewForm">
            <input type="hidden" name="Id" value="${New.Id}"/>
             <input 
                type="hidden"
                name="Creation"
                id="Creation"
                value="${New.Creation}"
            />

            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control "
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${New.Category}"
            />
           
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control "
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${New.Title}"
            />
           
            <label for="Text" class="form-label">Texte </label>
            <input 
                class="form-control"
                name="Text"
                id="Text"
                placeholder="Texte"
                required
                value="${New.Text}"
            />
            <!-- nécessite le fichier javascript 'imageControl.js' -->
             <label class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${New.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
            <hr>
            <input type="submit" value="Enregistrer" id="saveNew" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
    initImageUploaders();
    initFormValidation();
   
    $('#NewForm').on("submit", async function (event) {
        event.preventDefault();
        let New = getFormData($("#NewForm"));
        New.Creation = Date.now();
        New = await News_API.Save(New, create);
        if (!News_API.error) {
            showNews();
            await pageManager.update(false);
            compileCategories();
            pageManager.scrollToElem(New.Id);
        }
        else
            renderError("Une erreur est survenue!");
    });
    $('#cancel').on("click", function () {
        showNews();
    });
}

function renderNew(New) {
    const creationDate = new Date(New.Creation);

    const formattedDate = creationDate.toLocaleDateString('fr-FR', {
        weekday: 'long', 
        day: '2-digit',
        month: 'long', 
    });

    const formattedTime = creationDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const finalFormattedDate = `${ formattedDate.replace(/^(\w)/, (match) => match.toUpperCase())} - ${formattedTime}`;

    return $(`
      <div class="NewRow" id="sample">
            <div class="NewContainer noselect">
                <div class="NewLayout">

                    <div class="NewTop">
                        <span class="NewCategory">${New.Category}</span>
                        <div class="NewCommandPanel">
                            <span class="editCmd cmdIcon fa fa-pencil-square" editNewId="${New.Id}"
                                title="Modifier ${New.Title}"></span>
                            <span class="deleteCmd cmdIcon fa fa-window-close" deleteNewId="${New.Id}"
                                title="Effacer ${New.Title}"></span>
                        </div>
                    </div>

                    <span class="NewTitle">${New.Title}</span>

                    <div class="NewImageContainer">
                        <img class="NewImage" src="${New.Image}" alt="${New.Title}" />
                    </div>
                        <span class="NewCreation">${finalFormattedDate}</span>

                    <div class="NewTextContainer">
                        <span class="NewText">${New.Text}</span>
                        <button class="toggleTextButton">Afficher plus</button>
                    </div>
                </div>
            </div>
        </div>         
    `).on('click', '.toggleTextButton', function () {
        const container = $(this).closest('.NewTextContainer');
        const textElement = container.find('.NewText');
        const button = $(this);
        
        if (container.hasClass('expanded')) {
            container.removeClass('expanded');
            textElement.css('max-height', '3em'); 
            button.text('Afficher plus');
        } else {
            container.addClass('expanded');
            textElement.css('max-height', 'none'); 
            button.text('Afficher moins');
        }
    });
}
