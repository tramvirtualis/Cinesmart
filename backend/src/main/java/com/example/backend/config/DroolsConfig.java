package com.example.backend.config;

import org.kie.api.KieServices;
import org.kie.api.builder.KieBuilder;
import org.kie.api.builder.KieFileSystem;
import org.kie.api.builder.KieModule;
import org.kie.api.builder.Message;
import org.kie.api.runtime.KieContainer;
import org.kie.internal.io.ResourceFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DroolsConfig {
    
    private static final String RULES_PATH = "drools/";
    
    @Bean
    public KieContainer kieContainer() {
        KieServices kieServices = KieServices.Factory.get();
        
        KieFileSystem kieFileSystem = kieServices.newKieFileSystem();
        
        // Load all DRL files from resources/drools directory
        kieFileSystem.write(ResourceFactory.newClassPathResource(RULES_PATH + "showtime-date-constraint.drl"));
        kieFileSystem.write(ResourceFactory.newClassPathResource(RULES_PATH + "showtime-time-conflict.drl"));
        kieFileSystem.write(ResourceFactory.newClassPathResource(RULES_PATH + "showtime-validation.drl"));
        kieFileSystem.write(ResourceFactory.newClassPathResource(RULES_PATH + "voucher-validation.drl"));
        kieFileSystem.write(ResourceFactory.newClassPathResource(RULES_PATH + "price-calculation.drl"));
        kieFileSystem.write(ResourceFactory.newClassPathResource(RULES_PATH + "voucher-discount-calculation.drl"));
        kieFileSystem.write(ResourceFactory.newClassPathResource(RULES_PATH + "cancellation-validation.drl"));
        
        KieBuilder kieBuilder = kieServices.newKieBuilder(kieFileSystem);
        kieBuilder.buildAll();
        
        // Kiểm tra lỗi khi build rules
        if (kieBuilder.getResults().hasMessages(Message.Level.ERROR)) {
            List<Message> errors = kieBuilder.getResults().getMessages(Message.Level.ERROR);
            throw new RuntimeException("Lỗi khi build Drools rules: " + errors);
        }
        
        KieModule kieModule = kieBuilder.getKieModule();
        return kieServices.newKieContainer(kieModule.getReleaseId());
    }
}

