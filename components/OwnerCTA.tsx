import { useTranslations } from "next-intl";

export const OwnerCTA = () => {
    const t = useTranslations('OwnerSection');

    return (
        <div className="section-block section-owner">
            <div className="container">
                <div className="row justify-content-center justify-content-xl-start section-content">
                    <div className="col-xl-2 d-none d-xl-block"></div>
                    <div className="col-12 col-md-6 col-xl-8 rtl:text-right">
                        <div className="owner-text">
                            <p>{t('question')}</p><br />
                            <h3 className="fw-bold">{t.rich('title', {
                                br: () => <br />
                            })}</h3><br />
                            <h6>{t.rich('subtitle', {
                                br: () => <br />
                            })}</h6>
                        </div>
                        <a className="btn" href="/owner" target="_self">
                            <p className="mb-0">{t('button')}</p>
                        </a>
                    </div>
                </div>
            </div>
            <div className="owner-images">
                <figure
                    className="mb-0 owner-images__img"
                    style={{ left: "-5%", top: "-10%", height: "450px", width: "450px" }}
                >
                    <img className="img-fluid" src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/owner-section-image-1.png" alt="" />
                </figure>

                <figure
                    className="mb-0 owner-images__img"
                    style={{ left: "57%", top: "30%", height: "400px", width: "400px" }}
                >
                    <img className="img-fluid" src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/owner-section-image-2.png" alt="" />
                </figure>

                <figure
                    className="mb-0 owner-images__img"
                    style={{ left: "80%", top: "-10%", height: "450px", width: "300px" }}
                >
                    <img className="img-fluid" src="http://207.154.225.193/lovely-memories/wp-content/uploads/2024/04/owner-section-image-3.png" alt="" />
                </figure>
            </div>
        </div>
    );
};
