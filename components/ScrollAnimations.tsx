"use client";

import { useEffect } from "react";

export const ScrollAnimations = () => {
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "0px",
            threshold: 0.15 // Ativa quando 15% do elemento está visível
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("reveal-visible");
                    // Opcional: Parar de observar após a primeira animação
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Seletores dos elementos que queremos animar no HTML Legado
        const selectors = [
            ".section-block",
            ".buildings-posts__card",
            ".services-left__list--wrap > li", // Lista de serviços
            ".hero__content--title", // Título Hero
            ".hero__content--pretitle" // Pre-título Hero
        ];

        // Encontra elementos e adiciona classe inicial
        const elements = document.querySelectorAll(selectors.join(","));

        elements.forEach((el, index) => {
            el.classList.add("reveal-pending");
            // Adiciona delay escalonado para elementos irmãos (como grid cards)
            // Se for parte de uma lista/grid, tenta calcular delay
            if (el.classList.contains("buildings-posts__card")) {
                const parent = el.parentElement;
                if (parent) {
                    const childIndex = Array.from(parent.children).indexOf(el);
                    // Usa style inline para delay dinâmico
                    (el as HTMLElement).style.transitionDelay = `${childIndex * 100}ms`;
                }
            }
            observer.observe(el);
        });

        return () => {
            elements.forEach((el) => observer.unobserve(el));
            observer.disconnect();
        };
    }, []);

    return null;
};
